import { randomUUID } from "node:crypto";
import { getDb, schema } from "@/lib/db";
import { buildIssueCopy, listRules, type EvaluatedCheck } from "@/lib/rules/engine";
import { capAffected } from "@/lib/rules/types";
import { CATALOG_CHECKS } from "@/lib/rules/catalog.gen";
import type { RuleContext } from "@/lib/rules/types";
import type { ExtractedPage } from "@/lib/types/extracted";

export type PersistedCheck = {
  checkResultId: string;
  issueId: string | null;
};

/**
 * Persists check results and enforces the CORE INVARIANT:
 * every FAILED check creates exactly ONE issue with the SAME severity.
 * Warnings are advisory and never create issues.
 */
export function persistChecksAndIssues(args: {
  jobId: string;
  websiteId: string;
  checks: EvaluatedCheck[];
  ctxByPageId: Map<string, { extracted: ExtractedPage; headers: Record<string, string>; consoleErrors: string[] }>;
  allExtracted: ExtractedPage[];
}): { checksPersisted: number; issuesCreated: number } {
  const db = getDb();
  const now = Date.now();
  let issuesCreated = 0;

  // Upsert a CheckDefinition for every rule about to be persisted — analyzer
  // rules (Lighthouse/axe/security) are created dynamically at scan time.
  const uniqueRules = new Map(args.checks.map((c) => [c.rule.id, c.rule]));
  for (const r of uniqueRules.values()) upsertDefinition(r);

  for (const c of args.checks) {
    const checkResultId = randomUUID();
    db.insert(schema.checkResults)
      .values({
        id: checkResultId,
        jobId: args.jobId,
        websiteId: args.websiteId,
        checkId: c.rule.id,
        pageId: c.pageId,
        status: c.result.status,
        detailsJson: JSON.stringify({ evidence: c.result.evidence ?? null, details: c.result.details ?? null }),
        createdAt: now,
      })
      .run();

    if (c.result.status === "fail") {
      const pageCtx = c.pageId ? args.ctxByPageId.get(c.pageId) : undefined;
      const first = pageCtx ?? [...args.ctxByPageId.values()][0];
      if (!first) continue;
      const ctx: RuleContext = {
        page: first.extracted,
        headers: first.headers,
        consoleErrors: first.consoleErrors,
        allPages: args.allExtracted,
      };
      const copy = buildIssueCopy(c.rule, c.result, ctx);
      db.insert(schema.issues)
        .values({
          id: randomUUID(),
          checkResultId, // uniqueIndex enforces the 1:1 at the DB level
          websiteId: args.websiteId,
          jobId: args.jobId,
          pageId: c.pageId,
          sourceCheckId: c.rule.id,
          category: c.rule.category,
          severity: c.rule.failSeverity, // SAME severity as the failed check
          title: copy.title,
          description: copy.description,
          businessImpact: copy.businessImpact,
          fix: copy.fix,
          code: copy.code,
          effort: copy.effort,
          affectedJson:
            c.result.affected && c.result.affected.length > 0
              ? JSON.stringify(capAffected(c.result.affected))
              : null,
          status: "open",
          createdAt: now,
        })
        .run();
      issuesCreated++;
    }
  }

  return { checksPersisted: args.checks.length, issuesCreated };
}

function upsertDefinition(r: {
  id: string;
  category: string;
  name: string;
  checkClass: string;
  failSeverity: string;
  dataSource?: string;
}): void {
  getDb()
    .insert(schema.checkDefinitions)
    .values({
      id: r.id,
      category: r.category,
      name: r.name,
      description: "",
      checkClass: r.checkClass,
      failSeverity: r.failSeverity,
      dataSource: r.dataSource ?? "crawler",
      implemented: true,
    })
    .onConflictDoUpdate({
      target: schema.checkDefinitions.id,
      set: {
        category: r.category,
        name: r.name,
        checkClass: r.checkClass,
        failSeverity: r.failSeverity,
        dataSource: r.dataSource ?? "crawler",
        implemented: true,
      },
    })
    .run();
}

/**
 * Upserts a CheckDefinition row for every glob-discovered rule, plus the full
 * ported catalog (331 checks, 19 categories) as not-implemented definitions —
 * these surface as N/A in the registry, never as fake passes.
 */
export function syncCheckDefinitions(): void {
  for (const r of listRules()) upsertDefinition(r);

  const db = getDb();
  for (const c of CATALOG_CHECKS) {
    db.insert(schema.checkDefinitions)
      .values({
        id: c.id,
        category: c.category,
        name: c.name,
        description: "",
        checkClass: c.checkClass,
        failSeverity: c.failSeverity,
        dataSource: "crawler",
        implemented: false,
      })
      .onConflictDoNothing()
      .run();
  }
}
