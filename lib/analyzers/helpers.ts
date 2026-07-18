import type { Rule, RuleResult } from "@/lib/rules/types";
import type { CheckClass, IssueSeverity, ScoreCategory } from "@/lib/types";
import type { EvaluatedCheck } from "@/lib/rules/engine";

/**
 * Analyzer checks are created from real tool output at scan time (Lighthouse,
 * axe-core, TLS probe) rather than by evaluate() — the rule object carries the
 * metadata + issue copy, and the analyzer supplies the result directly.
 */
export function analyzerCheck(args: {
  id: string;
  name: string;
  category: string;
  checkClass: CheckClass;
  failSeverity: IssueSeverity;
  scoreCategory: ScoreCategory;
  dataSource: string;
  pageId: string | null;
  result: RuleResult;
  issue: {
    title: string;
    description: string;
    businessImpact: string;
    fix: string;
    code?: string | null;
    effort: "low" | "medium" | "high";
  };
}): EvaluatedCheck {
  const rule: Rule = {
    id: args.id,
    name: args.name,
    category: args.category,
    checkClass: args.checkClass,
    failSeverity: args.failSeverity,
    scoreCategory: args.scoreCategory,
    appliesTo: args.pageId ? "page" : "site",
    dataSource: args.dataSource,
    issue: {
      title: args.issue.title,
      description: args.issue.description,
      businessImpact: args.issue.businessImpact,
      fix: args.issue.fix,
      code: args.issue.code ?? undefined,
      effort: args.issue.effort,
    },
    evaluate: () => ({ status: "not-evaluated", evidence: "analyzer-driven check" }),
  };
  return { rule, result: args.result, pageId: args.pageId };
}
