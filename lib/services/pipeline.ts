import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";
import { crawlSite, type CrawledPage } from "@/lib/services/crawler";
import { runRules, type PageInput } from "@/lib/rules/engine";
import { persistChecksAndIssues, syncCheckDefinitions } from "@/lib/services/issues";
import { computeScores } from "@/lib/services/scoring";
import { appendLog, bumpStats, finishJob, markJobRunning, markStageFailed, setStage } from "@/lib/services/jobs";
import { runAnalyzers } from "@/lib/analyzers";
import { runAiStages, runFixGenerator } from "@/lib/ai/stages";
import type { ExtractedPage } from "@/lib/types/extracted";

// In-process run registry so a job can't run twice.
const globalForRuns = globalThis as unknown as { __wdRunning?: Set<string> };
function runningSet(): Set<string> {
  if (!globalForRuns.__wdRunning) globalForRuns.__wdRunning = new Set();
  return globalForRuns.__wdRunning;
}

export function startAnalysis(jobId: string, websiteId: string, url: string): void {
  if (runningSet().has(jobId)) return;
  runningSet().add(jobId);
  // Fire and forget — the heavy pipeline runs in this Node process, not edge.
  void runAnalysis(jobId, websiteId, url)
    .catch((e: unknown) => {
      logger.error({ jobId, err: String(e) }, "pipeline crashed");
      appendLog(jobId, `pipeline crashed: ${String(e).slice(0, 300)}`, "error");
      finishJob(jobId, "failed", String(e).slice(0, 500));
    })
    .finally(() => runningSet().delete(jobId));
}

export type PersistedPage = {
  pageId: string;
  crawled: CrawledPage;
};

/**
 * REAL analysis pipeline: crawl (≤10 same-origin pages) → per-page artifacts →
 * deep analyzers → rule engine → issues (1:1) → AI review → scores.
 * Every stage is independent: a failing stage yields partial results and never
 * aborts the run.
 */
async function runAnalysis(jobId: string, websiteId: string, url: string): Promise<void> {
  const db = getDb();
  markJobRunning(jobId);
  let hadStageFailure = false;

  // ---- Stages: crawl + discover + screenshots (interleaved by the crawler) ----
  setStage(jobId, "crawl");
  const crawled = await crawlSite(url, jobId, {
    onPageStart: (u) => appendLog(jobId, `GET ${u}`),
    onPageDone: (p) => {
      appendLog(jobId, `GET ${p.fetched.finalUrl} → ${p.fetched.statusCode} (${(p.fetched.loadTimeMs / 1000).toFixed(1)}s)`);
      bumpStats(jobId, { pagesFound: 1, screenshots: p.fetched.screenshotPath ? 1 : 0 });
    },
    onPageError: (u, err) => {
      appendLog(jobId, `✗ ${u}: ${err}`, "warn");
    },
  });

  if (crawled.length === 0) {
    appendLog(jobId, `could not fetch any page from ${url}`, "error");
    finishJob(jobId, "failed", `Could not fetch ${url}`);
    return;
  }

  setStage(jobId, "discover");
  appendLog(jobId, `crawled ${crawled.length} page(s), same-origin, deduped (cap ${config.crawl.maxPages})`);

  setStage(jobId, "screenshots");
  const shots = crawled.filter((c) => c.fetched.screenshotPath).length;
  appendLog(jobId, `captured ${shots} screenshot(s) at ${config.crawl.viewport.width}px`);
  if (shots < crawled.length) hadStageFailure = true;

  // ---- Stage: extract + persist pages/artifacts ----
  setStage(jobId, "extract");
  const persisted: PersistedPage[] = [];
  const now = Date.now();
  for (const c of crawled) {
    const pageId = randomUUID();
    const pagePath = new URL(c.fetched.finalUrl).pathname || "/";
    db.insert(schema.pages)
      .values({
        id: pageId,
        websiteId,
        jobId,
        url: c.fetched.finalUrl,
        path: pagePath,
        title: c.extracted.title,
        statusCode: c.fetched.statusCode,
        screenshotPath: c.fetched.screenshotPath || null,
        createdAt: now,
      })
      .run();

    const htmlDir = path.join(config.artifactsDir, jobId);
    fs.mkdirSync(htmlDir, { recursive: true });
    const htmlPath = path.join(htmlDir, `${c.slug}.html`);
    try {
      fs.writeFileSync(htmlPath, c.fetched.html);
    } catch (e) {
      logger.warn({ err: String(e) }, "html artifact write failed");
    }

    const artifacts: { type: string; filePath?: string; data?: unknown }[] = [
      { type: "screenshot", filePath: c.fetched.screenshotPath || undefined },
      { type: "html", filePath: htmlPath },
      { type: "headers", data: c.fetched.headers },
      { type: "extracted", data: c.extracted },
      { type: "console-errors", data: c.fetched.consoleErrors },
    ];
    for (const a of artifacts) {
      db.insert(schema.crawlArtifacts)
        .values({
          id: randomUUID(),
          pageId,
          jobId,
          type: a.type,
          filePath: a.filePath ?? null,
          dataJson: a.data !== undefined ? JSON.stringify(a.data) : null,
          createdAt: now,
        })
        .run();
    }
    persisted.push({ pageId, crawled: c });
  }
  const totals = crawled.reduce(
    (a, c) => ({
      images: a.images + c.extracted.images.length,
      forms: a.forms + c.extracted.forms.length,
    }),
    { images: 0, forms: 0 },
  );
  appendLog(jobId, `parsed ${crawled.length} documents with cheerio — ${totals.images} images, ${totals.forms} forms`);

  // ---- Deep analyzers (Phase 3) — each independent, degrades gracefully ----
  const analyzerChecks = await runAnalyzers({ jobId, websiteId, pages: persisted, hooks: { appendLog, setStage, bumpStats, markStageFailed } }).catch(
    (e: unknown) => {
      appendLog(jobId, `analyzers failed: ${String(e).slice(0, 200)}`, "error");
      hadStageFailure = true;
      return [];
    },
  );

  // ---- Stage: rule engine ----
  setStage(jobId, "rules");
  syncCheckDefinitions();
  const pageInputs: PageInput[] = persisted.map((p) => ({
    pageId: p.pageId,
    extracted: p.crawled.extracted,
    headers: p.crawled.fetched.headers,
    consoleErrors: p.crawled.fetched.consoleErrors,
  }));
  const checks = [...runRules(pageInputs), ...analyzerChecks];
  const evaluated = checks.filter((c) => c.result.status !== "not-evaluated").length;
  const failed = checks.filter((c) => c.result.status === "fail").length;
  const warned = checks.filter((c) => c.result.status === "warning").length;
  bumpStats(jobId, { checksRun: evaluated });
  appendLog(jobId, `${evaluated} checks executed — ${failed} failed · ${evaluated - failed - warned} passed · ${warned} warnings`);

  const ctxByPageId = new Map(
    persisted.map((p) => [
      p.pageId,
      {
        extracted: p.crawled.extracted,
        headers: p.crawled.fetched.headers,
        consoleErrors: p.crawled.fetched.consoleErrors,
      },
    ]),
  );
  const allExtracted: ExtractedPage[] = persisted.map((p) => p.crawled.extracted);
  const { issuesCreated } = persistChecksAndIssues({ jobId, websiteId, checks, ctxByPageId, allExtracted });
  appendLog(jobId, `${issuesCreated} issues opened (1:1 with failed checks)`);

  // ---- AI stages (vision / html / cross-page) — provider-driven, degrade gracefully ----
  let aiChecks: typeof checks = [];
  let aiIssues = 0;
  try {
    aiChecks = await runAiStages({ jobId, websiteId, pages: persisted, hooks: { appendLog, setStage, bumpStats, markStageFailed } });
    if (aiChecks.length > 0) {
      const res = persistChecksAndIssues({ jobId, websiteId, checks: aiChecks, ctxByPageId, allExtracted });
      aiIssues = res.issuesCreated;
      appendLog(jobId, `${aiIssues} AI finding(s) opened as issues (1:1 with failed checks)`);
    }
  } catch (e) {
    appendLog(jobId, `AI review unavailable: ${String(e).slice(0, 200)}`, "warn");
    hadStageFailure = true;
  }

  // ---- AI fix generator (enriches persisted issues) ----
  try {
    await runFixGenerator({ jobId, websiteId, pages: persisted, hooks: { appendLog, setStage, bumpStats, markStageFailed } });
  } catch (e) {
    appendLog(jobId, `fix generation unavailable: ${String(e).slice(0, 200)}`, "warn");
  }

  // ---- Stage: scores ----
  setStage(jobId, "scores");
  const scores = computeScores([...checks, ...aiChecks]);
  for (const [category, score] of Object.entries(scores)) {
    db.insert(schema.scores)
      .values({ id: randomUUID(), jobId, websiteId, category, score, createdAt: Date.now() })
      .run();
  }
  appendLog(jobId, `health ${scores.health} · seo ${scores["seo"]} · perf ${scores["performance"]} · a11y ${scores["accessibility"]}`);

  db.update(schema.websites).set({ lastScanAt: Date.now() }).where(eq(schema.websites.id, websiteId)).run();

  appendLog(jobId, `✓ analysis complete — ${issuesCreated + aiIssues} issues, health ${scores.health}`);
  finishJob(jobId, hadStageFailure ? "partial" : "completed");
}
