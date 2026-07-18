/**
 * THE scoring configuration — the single file that controls how failed checks
 * turn into scores. Tune weights here; nothing else needs to change.
 */

/** Points deducted from a category score per FAILED check of each severity. */
export const SEVERITY_DEDUCTIONS: Record<string, number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
};

/**
 * Optional per-rule weight multipliers (1 = default). A rule listed here has
 * its deduction scaled — e.g. 0.5 halves the penalty, 2 doubles it.
 */
export const RULE_WEIGHTS: Record<string, number> = {
  // Repeated per-page failures of the same cosmetic rule shouldn't crater a score.
  "code-inline-styles": 0.5,
  "seo-twitter-card": 0.5,
  "seo-favicon": 0.5,
  // The booking/conversion killers weigh full.
  "a11y-form-labels": 1,
  "seo-robots-indexable": 1.5,
};

/**
 * Repeat damping: when the SAME rule fails on many pages it is one underlying
 * problem, not N independent ones. The first failure deducts the full base;
 * each repeat adds `factor` × base, and the total per rule is capped at
 * `maxMultiplier` × base (e.g. base 8, 10 pages → 8 × 2 = 16, not 80).
 */
export const REPEAT_DAMPING = {
  factor: 0.25,
  maxMultiplier: 2,
} as const;

/** Relative weight of each category in the overall health score. */
export const CATEGORY_WEIGHTS: Record<string, number> = {
  seo: 1,
  accessibility: 1,
  performance: 1,
  ux: 1,
  conversion: 1,
  "best-practices": 1,
};

export const SCORE_BOUNDS = { min: 0, max: 100 } as const;
