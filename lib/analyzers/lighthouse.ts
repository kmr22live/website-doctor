import { randomUUID } from "node:crypto";
import { chromium } from "playwright";
import { getDb, schema } from "@/lib/db";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";
import { analyzerCheck } from "@/lib/analyzers/helpers";
import type { AnalyzerContext } from "@/lib/analyzers/types";
import type { EvaluatedCheck } from "@/lib/rules/engine";

type LhCategory = { score: number | null };
type LhNodeItem = { node?: { snippet?: string; selector?: string } };
type LhAudit = { numericValue?: number; displayValue?: string; details?: { items?: LhNodeItem[] } };
type LhResult = {
  categories: Record<string, LhCategory>;
  audits: Record<string, LhAudit>;
  /** Set by Lighthouse when the run itself failed (NO_FCP, page error, …). */
  runtimeError?: { code?: string; message?: string };
};

function ms(v: number | undefined): string {
  if (v === undefined) return "—";
  return v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${Math.round(v)}ms`;
}

/** Offending DOM nodes from a Lighthouse audit's details (LCP element, shifted elements…). */
function nodesFromAudit(audit: LhAudit | undefined) {
  return (audit?.details?.items ?? [])
    .filter((i) => i.node?.snippet)
    .slice(0, 5)
    .map((i) => ({
      selector: i.node?.selector?.slice(0, 120) ?? null,
      html: (i.node?.snippet ?? "").replace(/\s+/g, " ").trim().slice(0, 300),
    }));
}

/**
 * REAL Lighthouse runs (perf/a11y/SEO/best-practices) against a dedicated
 * debug-port Chromium. Raw JSON persisted per page; failures degrade gracefully.
 */
export async function runLighthouse(ctx: AnalyzerContext): Promise<EvaluatedCheck[]> {
  const { jobId, hooks } = ctx;
  const checks: EvaluatedCheck[] = [];
  const db = getDb();
  const port = 9222 + Math.floor(Math.random() * 500);

  const pages = ctx.pages.slice(0, config.analyzers.lighthouseMaxPages);
  if (pages.length === 0) return checks;

  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [`--remote-debugging-port=${port}`],
    });
    const { default: lighthouse } = await import("lighthouse");

    for (const p of pages) {
      const url = p.crawled.fetched.finalUrl;
      try {
        const runner = await Promise.race([
          lighthouse(url, {
            port,
            output: "json",
            logLevel: "silent",
            onlyCategories: ["performance", "accessibility", "seo", "best-practices"],
          }),
          new Promise<never>((_, rej) =>
            setTimeout(() => rej(new Error("lighthouse timeout")), config.analyzers.lighthouseTimeoutMs),
          ),
        ]);
        if (!runner) throw new Error("lighthouse returned nothing");
        const lhr = runner.lhr as unknown as LhResult;

        const perfScore = lhr.categories["performance"]?.score;
        const lcp = lhr.audits["largest-contentful-paint"]?.numericValue;
        const cls = lhr.audits["cumulative-layout-shift"]?.numericValue;
        const tbt = lhr.audits["total-blocking-time"]?.numericValue;
        const fcp = lhr.audits["first-contentful-paint"]?.numericValue;
        const inp = lhr.audits["interaction-to-next-paint"]?.numericValue;

        // Persist raw JSON + headline metrics as a crawl artifact (null scores stay null).
        db.insert(schema.crawlArtifacts)
          .values({
            id: randomUUID(),
            pageId: p.pageId,
            jobId,
            type: "lighthouse",
            filePath: null,
            dataJson: JSON.stringify({
              metrics: { lcp: ms(lcp), cls: cls !== undefined ? cls.toFixed(2) : "—", tbt: ms(tbt), fcp: ms(fcp), inp: ms(inp) },
              scores: Object.fromEntries(
                Object.entries(lhr.categories).map(([k, v]) => [k, v.score == null ? null : Math.round(v.score * 100)]),
              ),
              raw: lhr,
            }),
            createdAt: Date.now(),
          })
          .run();

        // A null category score means Lighthouse could NOT measure the page
        // (runtime error, NO_FCP, mid-run timeout). That is "did not run
        // properly" — never a real 0/100. Report it honestly and move on.
        if (perfScore == null) {
          const reason = lhr.runtimeError?.message ?? "Lighthouse produced no performance score for this page";
          hooks.appendLog(jobId, `lighthouse could not measure ${url}: ${reason.slice(0, 120)}`, "warn");
          checks.push(
            analyzerCheck({
              id: "lh-run",
              name: "Lighthouse audit ran",
              category: "Performance",
              checkClass: "notice",
              failSeverity: "low",
              scoreCategory: "performance",
              dataSource: "lighthouse",
              pageId: p.pageId,
              result: { status: "error", evidence: `Lighthouse could not measure ${url}: ${reason.slice(0, 200)}` },
              issue: { title: "Lighthouse audit ran", description: "", businessImpact: "", fix: "", effort: "low" },
            }),
          );
          continue;
        }
        const perf = Math.round(perfScore * 100);

        hooks.appendLog(jobId, `${new URL(url).pathname} perf ${perf} · LCP ${ms(lcp)} · CLS ${cls?.toFixed(2) ?? "—"}`);

        checks.push(
          analyzerCheck({
            id: "lh-performance-score",
            name: "Lighthouse performance score ≥ 50",
            category: "Performance",
            checkClass: "critical",
            failSeverity: "high",
            scoreCategory: "performance",
            dataSource: "lighthouse",
            pageId: p.pageId,
            result:
              perf < config.analyzers.perfFailBelow
                ? { status: "fail", evidence: `Lighthouse performance ${perf}/100`, details: perf }
                : perf < 90
                  ? { status: "warning", evidence: `Lighthouse performance ${perf}/100` }
                  : { status: "pass", evidence: `Lighthouse performance ${perf}/100` },
            issue: {
              title: `Poor Lighthouse performance score (${perf}/100)`,
              description: `${url} scores ${perf}/100 on Lighthouse performance. Key metrics: LCP ${ms(lcp)}, TBT ${ms(tbt)}, CLS ${cls?.toFixed(2) ?? "—"}.`,
              businessImpact:
                "Slow pages lose visitors before content appears — every extra second of load costs roughly 7% of conversions.",
              fix: "Compress the LCP image, defer non-critical JS/CSS, and lazy-load below-fold assets. The raw Lighthouse report pinpoints the heaviest opportunities.",
              effort: "medium",
            },
          }),
          analyzerCheck({
            id: "lh-lcp",
            name: `Largest Contentful Paint under ${config.analyzers.lcpFailMs / 1000}s`,
            category: "Performance",
            checkClass: "critical",
            failSeverity: "high",
            scoreCategory: "performance",
            dataSource: "lighthouse",
            pageId: p.pageId,
            result:
              lcp !== undefined && lcp > config.analyzers.lcpFailMs
                ? { status: "fail", evidence: `LCP ${ms(lcp)}`, details: lcp, affected: nodesFromAudit(lhr.audits["largest-contentful-paint-element"]) }
                : lcp !== undefined
                  ? { status: "pass", evidence: `LCP ${ms(lcp)}` }
                  : { status: "not-evaluated", evidence: "LCP not measured" },
            issue: {
              title: `Slow Largest Contentful Paint (${ms(lcp)})`,
              description: `The main content of ${url} takes ${ms(lcp)} to paint (Google's "good" threshold is 2.5s).`,
              businessImpact: "Visitors stare at an incomplete page — high LCP strongly correlates with bounce rate and hurts Core Web Vitals ranking.",
              fix: "Optimize the LCP element: compress/preload the hero image or reduce render-blocking resources before it.",
              code: '<link rel="preload" as="image" href="hero.avif" fetchpriority="high">',
              effort: "medium",
            },
          }),
          analyzerCheck({
            id: "lh-cls",
            name: `Cumulative Layout Shift under ${config.analyzers.clsFail}`,
            category: "Performance",
            checkClass: "warning",
            failSeverity: "medium",
            scoreCategory: "performance",
            dataSource: "lighthouse",
            pageId: p.pageId,
            result:
              cls !== undefined && cls > config.analyzers.clsFail
                ? { status: "fail", evidence: `CLS ${cls.toFixed(3)}`, details: cls, affected: nodesFromAudit(lhr.audits["layout-shift-elements"]) }
                : cls !== undefined
                  ? { status: "pass", evidence: `CLS ${cls.toFixed(3)}` }
                  : { status: "not-evaluated", evidence: "CLS not measured" },
            issue: {
              title: `Layout shifts during load (CLS ${cls?.toFixed(2) ?? "?"})`,
              description: `${url} shifts visibly while loading (CLS ${cls?.toFixed(2) ?? "?"} vs the 0.1 "good" threshold). Content jumps as images/fonts arrive.`,
              businessImpact: "Users misclick and lose their place — layout shift is a direct UX penalty and a Core Web Vitals ranking factor.",
              fix: "Reserve space for images/embeds with width+height attributes and preload web fonts.",
              code: '<img src="photo.jpg" width="800" height="450" alt="…">',
              effort: "low",
            },
          }),
          analyzerCheck({
            id: "lh-tbt",
            name: `Total Blocking Time under ${config.analyzers.tbtFailMs}ms`,
            category: "Performance",
            checkClass: "warning",
            failSeverity: "medium",
            scoreCategory: "performance",
            dataSource: "lighthouse",
            pageId: p.pageId,
            result:
              tbt !== undefined && tbt > config.analyzers.tbtFailMs
                ? { status: "fail", evidence: `TBT ${ms(tbt)}`, details: tbt }
                : tbt !== undefined
                  ? { status: "pass", evidence: `TBT ${ms(tbt)}` }
                  : { status: "not-evaluated", evidence: "TBT not measured" },
            issue: {
              title: `Main thread blocked for ${ms(tbt)}`,
              description: `JavaScript blocks the main thread of ${url} for ${ms(tbt)} during load — taps and clicks queue up unanswered.`,
              businessImpact: "An unresponsive page feels broken; users double-tap, rage-click, or leave.",
              fix: "Split long tasks, defer non-critical scripts, and drop unused JavaScript.",
              effort: "high",
            },
          }),
        );
      } catch (e) {
        hooks.appendLog(jobId, `lighthouse failed on ${url}: ${String(e).slice(0, 120)}`, "warn");
        logger.warn({ url, err: String(e) }, "lighthouse run failed");
        // Honest registry row: this page's Lighthouse audit did NOT run properly.
        checks.push(
          analyzerCheck({
            id: "lh-run",
            name: "Lighthouse audit ran",
            category: "Performance",
            checkClass: "notice",
            failSeverity: "low",
            scoreCategory: "performance",
            dataSource: "lighthouse",
            pageId: p.pageId,
            result: { status: "error", evidence: `Lighthouse did not run on ${url}: ${String(e).slice(0, 200)}` },
            issue: { title: "Lighthouse audit ran", description: "", businessImpact: "", fix: "", effort: "low" },
          }),
        );
      }
    }
  } finally {
    await browser?.close().catch(() => undefined);
  }

  return checks;
}
