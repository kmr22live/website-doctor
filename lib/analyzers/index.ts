import type { EvaluatedCheck } from "@/lib/rules/engine";
import type { AnalyzerContext } from "@/lib/analyzers/types";
import { runLighthouse } from "@/lib/analyzers/lighthouse";
import { runAxe } from "@/lib/analyzers/axe";
import { runSecurity } from "@/lib/analyzers/security";
import { runLinkChecks } from "@/lib/analyzers/links";
import { config } from "@/lib/config";

/**
 * Deep analyzers — each independent; a failing analyzer logs and contributes
 * nothing rather than aborting the run.
 */
export async function runAnalyzers(ctx: AnalyzerContext): Promise<EvaluatedCheck[]> {
  const { jobId, hooks } = ctx;
  const all: EvaluatedCheck[] = [];

  hooks.setStage(jobId, "lighthouse");
  if (config.analyzers.lighthouseMaxPages > 0) {
    try {
      all.push(...(await runLighthouse(ctx)));
    } catch (e) {
      hooks.appendLog(jobId, `lighthouse analyzer failed: ${String(e).slice(0, 150)}`, "warn");
      hooks.markStageFailed(jobId, "lighthouse");
    }
  } else {
    hooks.appendLog(jobId, "lighthouse disabled by config (LIGHTHOUSE_MAX_PAGES=0)");
  }

  hooks.setStage(jobId, "axe");
  try {
    all.push(...(await runAxe(ctx)));
  } catch (e) {
    hooks.appendLog(jobId, `axe analyzer failed: ${String(e).slice(0, 150)}`, "warn");
    hooks.markStageFailed(jobId, "axe");
  }

  hooks.setStage(jobId, "security");
  try {
    all.push(...(await runSecurity(ctx)));
  } catch (e) {
    hooks.appendLog(jobId, `security analyzer failed: ${String(e).slice(0, 150)}`, "warn");
    hooks.markStageFailed(jobId, "security");
  }

  hooks.setStage(jobId, "code-validation");
  try {
    const errs = ctx.pages.reduce((a, p) => a + p.crawled.fetched.consoleErrors.length, 0);
    hooks.appendLog(jobId, `console: ${errs} error(s) captured during load across ${ctx.pages.length} page(s)`);
    all.push(...(await runLinkChecks(ctx)));
  } catch (e) {
    hooks.appendLog(jobId, `link analyzer failed: ${String(e).slice(0, 150)}`, "warn");
    hooks.markStageFailed(jobId, "code-validation");
  }

  hooks.setStage(jobId, "search-console");
  hooks.appendLog(jobId, "Search Console not connected — category skipped");

  return all;
}
