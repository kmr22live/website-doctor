import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { listRules, runRules, type EvaluatedCheck, type PageInput } from "@/lib/rules/engine";
import { persistChecksAndIssues } from "@/lib/services/issues";
import { computeScores } from "@/lib/services/scoring";
import { rebuildEvaluatedChecks, rebuildPersistedPages } from "@/lib/services/rebuild-checks";
import { appendLog, bumpStats, markStageFailed, setStage } from "@/lib/services/jobs";
import { runLighthouse } from "@/lib/analyzers/lighthouse";
import { runAxe } from "@/lib/analyzers/axe";
import { runSecurity } from "@/lib/analyzers/security";
import { runLinkChecks } from "@/lib/analyzers/links";
import { runAiStages } from "@/lib/ai/stages";
import type { AnalyzerContext } from "@/lib/analyzers/types";
import { logger } from "@/lib/logger";

export type RerunStage = "rules" | "lighthouse" | "axe" | "security" | "links" | "ai";

export type RerunResult = {
  ok: boolean;
  scope: string;
  checksRun: number;
  failed: number;
  issuesOpened: number;
  resolvedKept: number;
  health: number;
  error?: string;
};

function stageForCheckId(checkId: string): RerunStage {
  if (listRules().some((r) => r.id === checkId)) return "rules";
  if (checkId.startsWith("lh-")) return "lighthouse";
  if (checkId.startsWith("axe-")) return "axe";
  if (checkId.startsWith("sec-")) return "security";
  if (checkId === "nav-broken-internal-links" || checkId === "nav-redirect-chain") return "links";
  if (checkId.startsWith("ai-")) return "ai";
  return "rules";
}

/** checkIds owned by a stage — the delete/replace scope for a stage re-run. */
function stageScope(jobId: string, stage: RerunStage): string[] {
  const db = getDb();
  switch (stage) {
    case "rules":
      return listRules().map((r) => r.id);
    case "links":
      return ["nav-broken-internal-links", "nav-redirect-chain"];
    default: {
      const ds = stage === "security" ? "tls" : stage;
      const defs = db.select().from(schema.checkDefinitions).all();
      const results = db.select().from(schema.checkResults).where(eq(schema.checkResults.jobId, jobId)).all();
      const resultIds = new Set(results.map((r) => r.checkId));
      return defs.filter((d) => d.dataSource === ds && resultIds.has(d.id)).map((d) => d.id);
    }
  }
}

/**
 * Targeted re-run: re-evaluates one check or one analyzer stage for a job
 * using stored artifacts (rules/security/AI) or a live revisit (lighthouse/
 * axe/links). Old results + issues in scope are replaced atomically; resolved
 * marks are carried over when the same check on the same page still fails;
 * scores are recomputed over the whole job.
 */
export async function rerunTarget(jobId: string, target: { checkId?: string; stage?: RerunStage }): Promise<RerunResult> {
  const db = getDb();
  const job = db.select().from(schema.analysisJobs).where(eq(schema.analysisJobs.id, jobId)).all()[0];
  if (!job) return { ok: false, scope: "", checksRun: 0, failed: 0, issuesOpened: 0, resolvedKept: 0, health: 0, error: "job not found" };

  const stage: RerunStage = target.stage ?? stageForCheckId(target.checkId ?? "");
  const scopeLabel = target.checkId ?? `stage:${stage}`;

  const persisted = rebuildPersistedPages(jobId);
  if (persisted.length === 0) {
    return { ok: false, scope: scopeLabel, checksRun: 0, failed: 0, issuesOpened: 0, resolvedKept: 0, health: 0, error: "no stored artifacts for this job — run a full re-scan" };
  }

  const ctx: AnalyzerContext = {
    jobId,
    websiteId: job.websiteId,
    pages: persisted,
    hooks: { appendLog, setStage, bumpStats, markStageFailed },
  };

  // ---- Produce fresh checks for the stage ----
  let produced: EvaluatedCheck[] = [];
  try {
    switch (stage) {
      case "rules": {
        const inputs: PageInput[] = persisted.map((p) => ({
          pageId: p.pageId,
          extracted: p.crawled.extracted,
          headers: p.crawled.fetched.headers,
          consoleErrors: p.crawled.fetched.consoleErrors,
        }));
        produced = runRules(inputs, target.checkId ? { ruleIds: [target.checkId] } : {});
        break;
      }
      case "lighthouse":
        produced = await runLighthouse(ctx);
        break;
      case "axe":
        produced = await runAxe(ctx);
        break;
      case "security":
        produced = await runSecurity(ctx);
        break;
      case "links":
        produced = await runLinkChecks(ctx);
        break;
      case "ai":
        produced = await runAiStages(ctx);
        break;
    }
  } catch (e) {
    logger.warn({ jobId, scope: scopeLabel, err: String(e) }, "re-run failed");
    return { ok: false, scope: scopeLabel, checksRun: 0, failed: 0, issuesOpened: 0, resolvedKept: 0, health: 0, error: `re-run failed: ${String(e).slice(0, 200)}` };
  }

  // Single-check re-run keeps only the requested check from the group output.
  if (target.checkId) produced = produced.filter((c) => c.rule.id === target.checkId);

  // Delete/replace scope: the checkIds we are replacing.
  const scopeIds = target.checkId ? [target.checkId] : stageScope(jobId, stage);
  if (scopeIds.length === 0 && produced.length === 0) {
    return { ok: false, scope: scopeLabel, checksRun: 0, failed: 0, issuesOpened: 0, resolvedKept: 0, health: 0, error: "nothing to re-run for this scope" };
  }
  const replaceIds = [...new Set([...scopeIds, ...produced.map((c) => c.rule.id)])];

  // ---- Capture resolved marks, then replace results + issues atomically ----
  const oldIssues = db
    .select()
    .from(schema.issues)
    .where(and(eq(schema.issues.jobId, jobId), inArray(schema.issues.sourceCheckId, replaceIds)))
    .all();
  const resolvedKeys = new Set(
    oldIssues.filter((i) => i.status === "resolved").map((i) => `${i.sourceCheckId}|${i.pageId ?? ""}`),
  );

  const ctxByPageId = new Map(
    persisted.map((p) => [
      p.pageId,
      { extracted: p.crawled.extracted, headers: p.crawled.fetched.headers, consoleErrors: p.crawled.fetched.consoleErrors },
    ]),
  );

  const { issuesCreated } = db.transaction((tx) => {
    tx.delete(schema.issues)
      .where(and(eq(schema.issues.jobId, jobId), inArray(schema.issues.sourceCheckId, replaceIds)))
      .run();
    tx.delete(schema.checkResults)
      .where(and(eq(schema.checkResults.jobId, jobId), inArray(schema.checkResults.checkId, replaceIds)))
      .run();
    return persistChecksAndIssues({
      jobId,
      websiteId: job.websiteId,
      checks: produced,
      ctxByPageId,
      allExtracted: persisted.map((p) => p.crawled.extracted),
    });
  });

  // ---- Carry resolved marks over (user decision: keep resolved) ----
  let resolvedKept = 0;
  if (resolvedKeys.size > 0) {
    const newIssues = db
      .select()
      .from(schema.issues)
      .where(and(eq(schema.issues.jobId, jobId), inArray(schema.issues.sourceCheckId, replaceIds)))
      .all();
    for (const ni of newIssues) {
      if (resolvedKeys.has(`${ni.sourceCheckId}|${ni.pageId ?? ""}`)) {
        db.update(schema.issues)
          .set({ status: "resolved", resolvedAt: Date.now() })
          .where(eq(schema.issues.id, ni.id))
          .run();
        resolvedKept++;
      }
    }
  }

  // ---- Recompute scores over the whole job ----
  const allChecks = rebuildEvaluatedChecks(jobId);
  const scores = computeScores(allChecks);
  for (const [category, score] of Object.entries(scores)) {
    db.insert(schema.scores)
      .values({ id: randomUUID(), jobId, websiteId: job.websiteId, category, score, createdAt: Date.now() })
      .onConflictDoUpdate({ target: [schema.scores.jobId, schema.scores.category], set: { score } })
      .run();
  }

  const failed = produced.filter((c) => c.result.status === "fail").length;
  appendLog(jobId, `re-ran ${scopeLabel}: ${produced.length} check(s), ${failed} failed, ${issuesCreated} issue(s), health ${scores.health}`);

  return {
    ok: true,
    scope: scopeLabel,
    checksRun: produced.length,
    failed,
    issuesOpened: issuesCreated,
    resolvedKept,
    health: scores.health,
  };
}
