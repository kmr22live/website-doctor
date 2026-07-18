import { ALL_RULES } from "@/lib/rules/defs/index.gen";
import type { Rule, RuleContext, RuleResult } from "@/lib/rules/types";
import { logger } from "@/lib/logger";
import type { ExtractedPage } from "@/lib/types/extracted";

export type PageInput = {
  pageId: string;
  extracted: ExtractedPage;
  headers: Record<string, string>;
  consoleErrors: string[];
};

export type EvaluatedCheck = {
  rule: Rule;
  result: RuleResult;
  /** null for site-level rules. */
  pageId: string | null;
};

export function listRules(): Rule[] {
  return ALL_RULES;
}

/**
 * Runs every discovered rule against real crawl data.
 * Page rules run once per page; site rules once per scan.
 * A throwing rule yields status "error" — one bad rule never kills the scan.
 * Pass opts.ruleIds to run a subset (targeted re-run).
 */
export function runRules(pages: PageInput[], opts: { ruleIds?: string[] } = {}): EvaluatedCheck[] {
  const out: EvaluatedCheck[] = [];
  const allExtracted = pages.map((p) => p.extracted);
  const rules = opts.ruleIds ? ALL_RULES.filter((r) => opts.ruleIds?.includes(r.id)) : ALL_RULES;

  for (const rule of rules) {
    if (rule.appliesTo === "page") {
      for (const p of pages) {
        const ctx: RuleContext = {
          page: p.extracted,
          headers: p.headers,
          consoleErrors: p.consoleErrors,
          allPages: allExtracted,
        };
        out.push({ rule, result: safeEvaluate(rule, ctx), pageId: p.pageId });
      }
    } else {
      const first = pages[0];
      if (!first) continue;
      const ctx: RuleContext = {
        page: first.extracted,
        headers: first.headers,
        consoleErrors: first.consoleErrors,
        allPages: allExtracted,
      };
      out.push({ rule, result: safeEvaluate(rule, ctx), pageId: null });
    }
  }
  return out;
}

function safeEvaluate(rule: Rule, ctx: RuleContext): RuleResult {
  try {
    return rule.evaluate(ctx);
  } catch (e) {
    logger.warn({ rule: rule.id, err: String(e) }, "rule threw — marked error");
    // Honest state: the check did NOT run properly. Never shown as pass or N/A.
    return { status: "error", evidence: `rule crashed: ${String(e).slice(0, 200)}` };
  }
}

/** Resolve issue copy for a failed check (1:1 invariant lives in the issue builder). */
export function buildIssueCopy(rule: Rule, result: RuleResult, ctx: RuleContext) {
  const resolve = (v: string | ((r: RuleResult, c: RuleContext) => string)) =>
    typeof v === "function" ? v(result, ctx) : v;
  const code =
    rule.issue.code === undefined
      ? null
      : typeof rule.issue.code === "function"
        ? rule.issue.code(result, ctx)
        : rule.issue.code;
  return {
    title: resolve(rule.issue.title).slice(0, 200),
    description: resolve(rule.issue.description),
    businessImpact: rule.issue.businessImpact,
    fix: rule.issue.fix,
    code,
    effort: rule.issue.effort,
  };
}
