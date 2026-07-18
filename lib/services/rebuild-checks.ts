import fs from "node:fs";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { listRules } from "@/lib/rules/engine";
import type { EvaluatedCheck } from "@/lib/rules/engine";
import type { Rule } from "@/lib/rules/types";
import type { ScoreCategory } from "@/lib/types";
import type { ExtractedPage } from "@/lib/types/extracted";
import { extractedPageSchema } from "@/lib/types/extracted";
import type { PersistedPage } from "@/lib/services/pipeline";
import type { FetchedPage } from "@/lib/services/fetcher";

export { CATEGORY_TO_SCORE } from "@/lib/score-map";
import { CATEGORY_TO_SCORE } from "@/lib/score-map";

/** Best-effort scoreCategory for a stored check id (analyzer rules are dynamic). */
export function scoreCategoryFor(checkId: string, defCategory: string | undefined, globRule?: Rule): ScoreCategory {
  if (globRule) return globRule.scoreCategory;
  if (checkId.startsWith("lh-")) return "performance";
  if (checkId.startsWith("axe-")) return "accessibility";
  if (checkId.startsWith("sec-")) return "best-practices";
  return CATEGORY_TO_SCORE[defCategory ?? ""] ?? "best-practices";
}

/**
 * Reconstructs EvaluatedCheck[] for a job from persisted check_results — used
 * to recompute scores after a targeted re-run (and by scripts/rescore.ts).
 */
export function rebuildEvaluatedChecks(jobId: string): EvaluatedCheck[] {
  const db = getDb();
  const ruleMeta = new Map(listRules().map((r) => [r.id, r]));
  const defs = new Map(db.select().from(schema.checkDefinitions).all().map((d) => [d.id, d]));
  const results = db.select().from(schema.checkResults).where(eq(schema.checkResults.jobId, jobId)).all();

  return results.map((r) => {
    const glob = ruleMeta.get(r.checkId);
    const def = defs.get(r.checkId);
    const rule: Rule = glob ?? {
      id: r.checkId,
      name: def?.name ?? r.checkId,
      category: def?.category ?? "Uncategorized",
      checkClass: (def?.checkClass ?? "notice") as Rule["checkClass"],
      failSeverity: (def?.failSeverity ?? "low") as Rule["failSeverity"],
      scoreCategory: scoreCategoryFor(r.checkId, def?.category),
      appliesTo: "page",
      issue: { title: "", description: "", businessImpact: "", fix: "", effort: "low" },
      evaluate: () => ({ status: "not-evaluated" }),
    };
    return {
      rule,
      result: { status: r.status as EvaluatedCheck["result"]["status"] },
      pageId: r.pageId,
    };
  });
}

/**
 * Reconstructs PersistedPage[] for a job from stored crawl artifacts, so rules,
 * analyzers, and AI stages can re-run WITHOUT a fresh crawl. HTML is reloaded
 * from disk when the artifact file still exists.
 */
export function rebuildPersistedPages(jobId: string): PersistedPage[] {
  const db = getDb();
  const pages = db.select().from(schema.pages).where(eq(schema.pages.jobId, jobId)).all();
  const artifacts = db
    .select()
    .from(schema.crawlArtifacts)
    .where(
      and(
        eq(schema.crawlArtifacts.jobId, jobId),
        inArray(schema.crawlArtifacts.type, ["extracted", "headers", "console-errors", "html"]),
      ),
    )
    .all();

  const byPage = new Map<string, Map<string, (typeof artifacts)[number]>>();
  for (const a of artifacts) {
    const m = byPage.get(a.pageId) ?? new Map();
    m.set(a.type, a);
    byPage.set(a.pageId, m);
  }

  const out: PersistedPage[] = [];
  for (const p of pages) {
    const arts = byPage.get(p.id);
    const extractedRaw = arts?.get("extracted")?.dataJson;
    if (!extractedRaw) continue; // page without extraction artifact cannot be re-evaluated
    let extracted: ExtractedPage;
    try {
      extracted = extractedPageSchema.parse(JSON.parse(extractedRaw));
    } catch {
      continue;
    }
    let headers: Record<string, string> = {};
    try {
      headers = JSON.parse(arts?.get("headers")?.dataJson ?? "{}") as Record<string, string>;
    } catch {
      // keep empty
    }
    let consoleErrors: string[] = [];
    try {
      consoleErrors = JSON.parse(arts?.get("console-errors")?.dataJson ?? "[]") as string[];
    } catch {
      // keep empty
    }
    const htmlPath = arts?.get("html")?.filePath ?? null;
    const html = htmlPath && fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, "utf8") : "";

    const fetched: FetchedPage = {
      url: p.url,
      finalUrl: p.url,
      statusCode: p.statusCode,
      html,
      headers,
      screenshotPath: p.screenshotPath ?? "",
      consoleErrors,
      loadTimeMs: 0,
      redirectChain: [],
    };
    out.push({
      pageId: p.id,
      crawled: { fetched, extracted, slug: p.path.replace(/[^a-zA-Z0-9]+/g, "-") || "home" },
    });
  }
  return out;
}
