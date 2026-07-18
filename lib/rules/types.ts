import type { CheckClass, IssueSeverity, ScoreCategory } from "@/lib/types";
import type { ExtractedPage } from "@/lib/types/extracted";

/** Context handed to every rule evaluation. */
export type RuleContext = {
  /** The page under evaluation (for appliesTo: "page"), or the first page (for site rules). */
  page: ExtractedPage;
  /** Response headers of the page fetch (lowercased keys). */
  headers: Record<string, string>;
  /** Console errors captured during the page load. */
  consoleErrors: string[];
  /** All crawled pages — site-level rules reason across these. */
  allPages: ExtractedPage[];
};

export type RuleStatus = "pass" | "fail" | "warning" | "not-evaluated" | "error";

/** An offending element from the scanned page, for the issue drawer. */
export type AffectedElement = {
  /** CSS-ish selector locating the element (best effort). */
  selector: string | null;
  /** The element's actual HTML, truncated. */
  html: string;
};

export const AFFECTED_CAP = 5;
export const AFFECTED_HTML_MAX = 300;

export function capAffected(list: AffectedElement[]): AffectedElement[] {
  return list.slice(0, AFFECTED_CAP).map((a) => ({
    selector: a.selector ? a.selector.slice(0, 120) : null,
    html: a.html.slice(0, AFFECTED_HTML_MAX),
  }));
}

export type RuleResult = {
  status: RuleStatus;
  /** Human-readable evidence: what we actually found. */
  evidence?: string;
  /** Structured details persisted with the check result. */
  details?: unknown;
  /** Offending elements (real page HTML) shown in the issue drawer. */
  affected?: AffectedElement[];
};

/** Copy used to build the 1:1 Issue when this rule fails. */
export type RuleIssueCopy = {
  title: string | ((r: RuleResult, ctx: RuleContext) => string);
  description: string | ((r: RuleResult, ctx: RuleContext) => string);
  businessImpact: string;
  fix: string;
  code?: string | ((r: RuleResult, ctx: RuleContext) => string | null);
  effort: "low" | "medium" | "high";
};

export type Rule = {
  /** Stable id, e.g. "seo-title-exists". */
  id: string;
  /** Registry display name. */
  name: string;
  /** Issue category shown in the dashboard (SEO, Accessibility, …). */
  category: string;
  /** Check-class chip for passing registry rows. */
  checkClass: CheckClass;
  /** Issue severity assigned when the rule FAILS (1:1 invariant). */
  failSeverity: IssueSeverity;
  /** Which of the 6 category scores a failure deducts from. */
  scoreCategory: ScoreCategory;
  /** Page rules run once per crawled page; site rules run once per scan. */
  appliesTo: "page" | "site";
  dataSource?: string;
  issue: RuleIssueCopy;
  evaluate: (ctx: RuleContext) => RuleResult;
};

export function defineRule(rule: Rule): Rule {
  return rule;
}
