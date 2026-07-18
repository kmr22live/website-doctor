import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";
import { getAiProvider, aiAvailable } from "@/lib/ai";
import { loadPrompt, fillPrompt } from "@/lib/ai/prompts";
import { aiReviewSchema, aiCrossPageSchema, aiFixSchema, type AiFinding } from "@/lib/ai/schemas";
import { analyzerCheck } from "@/lib/analyzers/helpers";
import type { AnalyzerContext } from "@/lib/analyzers/types";
import type { EvaluatedCheck } from "@/lib/rules/engine";
import type { ScoreCategory } from "@/lib/types";

/** Optional pause between AI calls — keeps free tiers under per-minute limits. */
async function callGap(): Promise<void> {
  if (config.ai.callGapMs > 0) await new Promise((r) => setTimeout(r, config.ai.callGapMs));
}

const CATEGORY_TO_SCORE: Record<string, ScoreCategory> = {
  UX: "ux",
  Conversion: "conversion",
  Content: "seo",
  Accessibility: "accessibility",
  SEO: "seo",
  "Code quality": "best-practices",
};

function saveAiResponse(args: {
  jobId: string;
  websiteId: string;
  pageId: string | null;
  kind: string;
  promptFile: string;
  response: unknown;
}): void {
  getDb()
    .insert(schema.aiResponses)
    .values({
      id: randomUUID(),
      jobId: args.jobId,
      websiteId: args.websiteId,
      pageId: args.pageId,
      kind: args.kind,
      model: config.ai.model,
      promptFile: args.promptFile,
      responseJson: JSON.stringify(args.response),
      createdAt: Date.now(),
    })
    .run();
}

function findingToCheck(kind: "vision" | "html" | "cross-page", f: AiFinding, pageId: string | null, url: string): EvaluatedCheck {
  return analyzerCheck({
    id: `ai-${kind}-review`,
    name: kind === "vision" ? "AI vision review" : kind === "html" ? "AI HTML review" : "AI cross-page consistency",
    category: f.category,
    checkClass: "warning",
    failSeverity: f.severity,
    scoreCategory: CATEGORY_TO_SCORE[f.category] ?? "ux",
    dataSource: "ai",
    pageId,
    result: { status: "fail", evidence: `${f.title} — observed on ${url}` },
    issue: {
      title: f.title,
      description: f.description,
      businessImpact: f.businessImpact,
      fix: f.fix,
      code: f.code,
      effort: "medium",
    },
  });
}

/**
 * REAL AI stages behind the AIProvider interface (Gemini default):
 * vision review per screenshot, HTML review per page, cross-page consistency.
 * Returns extra checks (each finding fails 1:1 into an issue downstream).
 */
export async function runAiStages(ctx: AnalyzerContext): Promise<EvaluatedCheck[]> {
  const { jobId, websiteId, hooks } = ctx;
  const checks: EvaluatedCheck[] = [];

  if (!aiAvailable()) {
    hooks.setStage(jobId, "ai-vision");
    hooks.appendLog(jobId, "AI provider not configured (set GEMINI_API_KEY) — AI review skipped", "warn");
    for (const st of ["ai-vision", "ai-html", "cross-page"]) hooks.markStageFailed(jobId, st);
    hooks.setStage(jobId, "ai-html");
    hooks.setStage(jobId, "cross-page");
    return checks;
  }
  const ai = getAiProvider();
  const maxFindings = config.ai.maxFindingsPerReview;

  // ---- AI vision review (real screenshots) ----
  hooks.setStage(jobId, "ai-vision");
  const visionPages = ctx.pages.filter((p) => p.crawled.fetched.screenshotPath).slice(0, config.ai.maxVisionPages);
  for (const p of visionPages) {
    const url = p.crawled.fetched.finalUrl;
    try {
      const img = fs.readFileSync(p.crawled.fetched.screenshotPath).toString("base64");
      const prompt = fillPrompt(loadPrompt("vision"), { URL: url, MAX_FINDINGS: maxFindings });
      const review = await ai.vision(img, "image/png", prompt, { schema: aiReviewSchema, schemaName: "vision-review" });
      saveAiResponse({ jobId, websiteId, pageId: p.pageId, kind: "vision", promptFile: "vision.md", response: review });
      hooks.bumpStats(jobId, { aiReviews: 1 });
      for (const f of review.findings.slice(0, maxFindings)) checks.push(findingToCheck("vision", f, p.pageId, url));
      hooks.appendLog(jobId, `vision ${new URL(url).pathname}: ${review.findings.length} finding(s)`);
    } catch (e) {
      hooks.appendLog(jobId, `vision review failed on ${url}: ${String(e).slice(0, 120)}`, "warn");
      logger.warn({ url, err: String(e) }, "ai vision failed");
      checks.push(aiErrorCheck("vision", p.pageId, url, e));
    }
    await callGap();
  }

  // ---- AI HTML review (real extracted data + rule results) ----
  hooks.setStage(jobId, "ai-html");
  const db = getDb();
  const htmlPages = ctx.pages.slice(0, config.ai.maxHtmlReviewPages);
  for (const p of htmlPages) {
    const url = p.crawled.fetched.finalUrl;
    try {
      const x = p.crawled.extracted;
      const compact = {
        url: x.finalUrl,
        title: x.title,
        metaDescription: x.metaDescription,
        canonical: x.canonical,
        headings: x.headings.slice(0, 30),
        imageCount: x.images.length,
        imagesMissingAlt: x.images.filter((i) => i.alt === null).length,
        links: x.links.slice(0, 40).map((l) => ({ href: l.href.slice(0, 100), text: l.text.slice(0, 60) })),
        forms: x.forms,
        buttons: x.buttons.slice(0, 20),
        schemaTypes: x.schemaTypes,
        ogTags: x.ogTags,
        wordCount: x.wordCount,
        textSample: x.textSample.slice(0, 1200),
      };
      const ruleResults = db
        .select()
        .from(schema.checkResults)
        .where(and(eq(schema.checkResults.jobId, jobId), eq(schema.checkResults.pageId, p.pageId)))
        .all()
        .filter((r) => r.status === "fail")
        .map((r) => r.checkId);
      const prompt = fillPrompt(loadPrompt("html-review"), {
        URL: url,
        EXTRACTED: JSON.stringify(compact),
        RULE_RESULTS: JSON.stringify(ruleResults),
        MAX_FINDINGS: maxFindings,
      });
      const review = await ai.complete(prompt, { schema: aiReviewSchema, schemaName: "html-review" });
      saveAiResponse({ jobId, websiteId, pageId: p.pageId, kind: "html-review", promptFile: "html-review.md", response: review });
      hooks.bumpStats(jobId, { aiReviews: 1 });
      for (const f of review.findings.slice(0, maxFindings)) checks.push(findingToCheck("html", f, p.pageId, url));
      hooks.appendLog(jobId, `html ${new URL(url).pathname}: ${review.findings.length} finding(s)`);
    } catch (e) {
      hooks.appendLog(jobId, `html review failed on ${url}: ${String(e).slice(0, 120)}`, "warn");
      checks.push(aiErrorCheck("html", p.pageId, url, e));
    }
    await callGap();
  }

  // ---- Cross-page consistency + executive summary ----
  hooks.setStage(jobId, "cross-page");
  try {
    const domain = new URL(ctx.pages[0]?.crawled.fetched.finalUrl ?? "https://unknown").hostname;
    const pagesCompact = ctx.pages.map((p) => ({
      path: new URL(p.crawled.fetched.finalUrl).pathname,
      title: p.crawled.extracted.title,
      h1: p.crawled.extracted.headings.filter((h) => h.level === 1).map((h) => h.text),
      buttons: p.crawled.extracted.buttons.slice(0, 10),
      footerLinkCount: p.crawled.extracted.links.length,
    }));
    const failedSite = getDb()
      .select()
      .from(schema.checkResults)
      .where(eq(schema.checkResults.jobId, jobId))
      .all()
      .filter((r) => r.status === "fail").length;
    const issues = getDb().select().from(schema.issues).where(eq(schema.issues.jobId, jobId)).all();
    const sevCounts = issues.reduce<Record<string, number>>((a, i) => ({ ...a, [i.severity]: (a[i.severity] ?? 0) + 1 }), {});
    const prompt = fillPrompt(loadPrompt("cross-page"), {
      DOMAIN: domain,
      PAGE_COUNT: ctx.pages.length,
      PAGES: JSON.stringify(pagesCompact),
      RULE_RESULTS: JSON.stringify(issues.filter((i) => !i.pageId).map((i) => i.title)),
      SCORES_AND_ISSUES: JSON.stringify({
        failedChecks: failedSite,
        issueCount: issues.length,
        severities: sevCounts,
        topIssues: issues.slice(0, 12).map((i) => `${i.severity}: ${i.title}`),
      }),
      MAX_FINDINGS: maxFindings,
    });
    const review = await ai.complete(prompt, { schema: aiCrossPageSchema, schemaName: "cross-page" });
    saveAiResponse({ jobId, websiteId, pageId: null, kind: "cross-page", promptFile: "cross-page.md", response: review });
    hooks.bumpStats(jobId, { aiReviews: 1 });
    for (const f of review.findings.slice(0, maxFindings)) {
      checks.push(findingToCheck("cross-page", f, null, domain));
    }
    hooks.appendLog(jobId, `cross-page: ${review.findings.length} finding(s), executive summary generated`);
  } catch (e) {
    hooks.appendLog(jobId, `cross-page review failed: ${String(e).slice(0, 120)}`, "warn");
    checks.push(aiErrorCheck("cross-page", null, "site", e));
  }

  return checks;
}

/** Honest registry row when an AI review call did NOT run properly. */
function aiErrorCheck(kind: "vision" | "html" | "cross-page", pageId: string | null, url: string, e: unknown): EvaluatedCheck {
  const name = kind === "vision" ? "AI vision review" : kind === "html" ? "AI HTML review" : "AI cross-page consistency";
  return analyzerCheck({
    id: `ai-${kind}-review`,
    name,
    category: "UX",
    checkClass: "warning",
    failSeverity: "low",
    scoreCategory: "ux",
    dataSource: "ai",
    pageId,
    result: { status: "error", evidence: `${name} did not run on ${url}: ${String(e).slice(0, 200)}` },
    issue: { title: name, description: "", businessImpact: "", fix: "", effort: "low" },
  });
}

/**
 * AI fix generator: enriches the highest-severity issues with page-specific
 * description/impact/fix/code. Runs after issues are persisted.
 */
export async function runFixGenerator(ctx: AnalyzerContext): Promise<void> {
  const { jobId, websiteId, hooks } = ctx;
  hooks.setStage(jobId, "fixes");
  if (!aiAvailable()) {
    hooks.appendLog(jobId, "AI provider not configured — rule-based fixes kept as-is");
    return;
  }
  const ai = getAiProvider();
  const db = getDb();

  const sevOrder = ["critical", "high", "medium", "low"];
  const issues = db
    .select()
    .from(schema.issues)
    .where(and(eq(schema.issues.jobId, jobId), inArray(schema.issues.status, ["open"])))
    .orderBy(desc(schema.issues.createdAt))
    .all()
    .sort((a, b) => sevOrder.indexOf(a.severity) - sevOrder.indexOf(b.severity))
    .filter((i) => !i.sourceCheckId.startsWith("ai-")) // AI findings already carry AI copy
    .slice(0, config.ai.maxIssuesForFixGeneration);

  const pageById = new Map(ctx.pages.map((p) => [p.pageId, p]));
  let enriched = 0;
  for (const issue of issues) {
    try {
      const page = issue.pageId ? pageById.get(issue.pageId) : ctx.pages[0];
      const x = page?.crawled.extracted;
      const result = db
        .select()
        .from(schema.checkResults)
        .where(eq(schema.checkResults.id, issue.checkResultId))
        .all()[0];
      const evidence = result?.detailsJson ? (JSON.parse(result.detailsJson) as { evidence?: string }).evidence ?? "" : "";
      const prompt = fillPrompt(loadPrompt("fix-generator"), {
        URL: page?.crawled.fetched.finalUrl ?? issue.websiteId,
        CHECK_ID: issue.sourceCheckId,
        TITLE: issue.title,
        SEVERITY: issue.severity,
        CATEGORY: issue.category,
        EVIDENCE: evidence || issue.description.slice(0, 300),
        AFFECTED: issue.affectedJson ?? "[]",
        PAGE_CONTEXT: JSON.stringify({
          title: x?.title,
          metaDescription: x?.metaDescription,
          h1: x?.headings.filter((h) => h.level === 1).map((h) => h.text),
          imageCount: x?.images.length,
          textSample: x?.textSample.slice(0, 500),
        }),
      });
      const fix = await ai.complete(prompt, { schema: aiFixSchema, schemaName: "fix" });
      db.update(schema.issues)
        .set({
          description: fix.description,
          businessImpact: fix.businessImpact,
          fix: fix.fix,
          code: fix.code,
          effort: fix.effort,
        })
        .where(eq(schema.issues.id, issue.id))
        .run();
      saveAiResponse({ jobId, websiteId, pageId: issue.pageId, kind: "fix", promptFile: "fix-generator.md", response: { issueId: issue.id, ...fix } });
      hooks.bumpStats(jobId, { aiReviews: 1 });
      enriched++;
    } catch (e) {
      logger.warn({ issue: issue.id, err: String(e) }, "fix generation failed — rule-based copy kept");
    }
    await callGap();
  }
  hooks.appendLog(jobId, `generated ${enriched} AI fix card(s) (${issues.length - enriched} kept rule-based copy)`);
}
