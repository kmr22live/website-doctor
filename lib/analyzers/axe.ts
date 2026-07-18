import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { getBrowser } from "@/lib/services/fetcher";
import { getDb, schema } from "@/lib/db";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";
import { analyzerCheck } from "@/lib/analyzers/helpers";
import type { AnalyzerContext } from "@/lib/analyzers/types";
import type { EvaluatedCheck } from "@/lib/rules/engine";
import type { IssueSeverity } from "@/lib/types";

const IMPACT_TO_SEVERITY: Record<string, IssueSeverity> = {
  critical: "critical",
  serious: "high",
  moderate: "medium",
  minor: "low",
};

/**
 * REAL axe-core accessibility scan: each crawled page is re-opened in the
 * shared Chromium and audited; every violation becomes a check → issue (1:1).
 */
export async function runAxe(ctx: AnalyzerContext): Promise<EvaluatedCheck[]> {
  const { jobId, hooks } = ctx;
  const checks: EvaluatedCheck[] = [];
  const db = getDb();
  const browser = await getBrowser();

  const pages = ctx.pages.slice(0, config.analyzers.axeMaxPages);
  for (const p of pages) {
    const url = p.crawled.fetched.finalUrl;
    const context = await browser.newContext({
      viewport: config.crawl.viewport,
      userAgent: config.crawl.userAgent,
      ignoreHTTPSErrors: true,
    });
    try {
      const page = await context.newPage();
      await page.goto(url, { timeout: config.crawl.timeoutMs, waitUntil: "domcontentloaded" });
      const results = await new AxeBuilder({ page }).analyze();

      db.insert(schema.crawlArtifacts)
        .values({
          id: randomUUID(),
          pageId: p.pageId,
          jobId,
          type: "axe",
          filePath: null,
          dataJson: JSON.stringify({
            violations: results.violations.map((v) => ({
              id: v.id,
              impact: v.impact,
              help: v.help,
              nodes: v.nodes.length,
            })),
            passes: results.passes.length,
          }),
          createdAt: Date.now(),
        })
        .run();

      for (const v of results.violations) {
        const severity = IMPACT_TO_SEVERITY[v.impact ?? "minor"] ?? "low";
        const firstTarget = v.nodes[0]?.target?.join(" ") ?? "";
        // Real offending elements — axe hands us each node's actual HTML.
        const affected = v.nodes.slice(0, 5).map((n) => ({
          selector: n.target?.map(String).join(" ").slice(0, 120) ?? null,
          html: (n.html ?? "").replace(/\s+/g, " ").trim().slice(0, 300),
        }));
        checks.push(
          analyzerCheck({
            id: `axe-${v.id}`,
            name: v.help,
            category: "Accessibility",
            checkClass: v.impact === "critical" || v.impact === "serious" ? "critical" : "warning",
            failSeverity: severity,
            scoreCategory: "accessibility",
            dataSource: "axe",
            pageId: p.pageId,
            result: {
              status: "fail",
              evidence: `${v.nodes.length} element(s) violate "${v.id}" on ${url}`,
              details: v.nodes.length,
              affected,
            },
            issue: {
              title: `${v.help} (${v.nodes.length} element${v.nodes.length === 1 ? "" : "s"})`,
              description: `axe-core flags ${v.nodes.length} element(s) on ${url} for "${v.id}" (impact: ${v.impact ?? "unknown"}). ${v.description} First affected element: ${firstTarget.slice(0, 120)}`,
              businessImpact:
                "Accessibility violations exclude assistive-technology users and expose the business to ADA/EAA compliance risk.",
              fix: `${v.helpUrl ? `Follow the axe guidance: ${v.helpUrl}` : "Fix per WCAG guidance."}`,
              effort: v.nodes.length > 10 ? "high" : "low",
            },
          }),
        );
      }
      const passIds = new Set(results.passes.map((r) => r.id));
      // Record headline passing axe rules as passing checks (bounded set).
      for (const id of ["label", "color-contrast", "image-alt", "link-name", "button-name"]) {
        if (passIds.has(id) && !results.violations.some((v) => v.id === id)) {
          checks.push(
            analyzerCheck({
              id: `axe-${id}`,
              name: `axe: ${id}`,
              category: "Accessibility",
              checkClass: "critical",
              failSeverity: "high",
              scoreCategory: "accessibility",
              dataSource: "axe",
              pageId: p.pageId,
              result: { status: "pass", evidence: `axe rule "${id}" passes on ${url}` },
              issue: {
                title: `axe: ${id}`,
                description: "",
                businessImpact: "",
                fix: "",
                effort: "low",
              },
            }),
          );
        }
      }
      hooks.appendLog(jobId, `axe ${new URL(url).pathname}: ${results.violations.length} violation type(s)`);
    } catch (e) {
      hooks.appendLog(jobId, `axe failed on ${url}: ${String(e).slice(0, 120)}`, "warn");
      logger.warn({ url, err: String(e) }, "axe run failed");
      // Honest registry row: this page's accessibility scan did NOT run properly.
      checks.push(
        analyzerCheck({
          id: "axe-run",
          name: "axe-core accessibility scan ran",
          category: "Accessibility",
          checkClass: "notice",
          failSeverity: "low",
          scoreCategory: "accessibility",
          dataSource: "axe",
          pageId: p.pageId,
          result: { status: "error", evidence: `axe-core did not run on ${url}: ${String(e).slice(0, 200)}` },
          issue: { title: "axe-core accessibility scan ran", description: "", businessImpact: "", fix: "", effort: "low" },
        }),
      );
    } finally {
      await context.close().catch(() => undefined);
    }
  }

  return checks;
}
