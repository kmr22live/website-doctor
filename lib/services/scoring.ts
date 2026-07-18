import { SEVERITY_DEDUCTIONS, RULE_WEIGHTS, CATEGORY_WEIGHTS, SCORE_BOUNDS, REPEAT_DAMPING } from "@/config/scoring-weights";
import type { EvaluatedCheck } from "@/lib/rules/engine";
import { scoreCategorySchema } from "@/lib/types";

export type ScoreSet = Record<string, number> & { health: number };

/**
 * Configurable scoring engine: per-rule weights live in ONE config file
 * (config/scoring-weights.ts). Each category starts at 100 and loses
 * severity-weighted deductions per FAILED check; health is the
 * category-weighted mean.
 */
export function computeScores(checks: EvaluatedCheck[]): ScoreSet {
  const categories = scoreCategorySchema.options;
  const scores: Record<string, number> = {};
  for (const cat of categories) scores[cat] = 100;

  // Group failures by rule: the same rule failing on N pages is ONE underlying
  // problem — repeats add damped increments, capped (config REPEAT_DAMPING).
  const failsByRule = new Map<string, { count: number; cat: string; base: number; weight: number }>();
  for (const c of checks) {
    if (c.result.status !== "fail") continue;
    const entry = failsByRule.get(c.rule.id);
    if (entry) {
      entry.count++;
    } else {
      failsByRule.set(c.rule.id, {
        count: 1,
        cat: c.rule.scoreCategory,
        base: SEVERITY_DEDUCTIONS[c.rule.failSeverity] ?? 5,
        weight: RULE_WEIGHTS[c.rule.id] ?? 1,
      });
    }
  }
  for (const f of failsByRule.values()) {
    const multiplier = Math.min(REPEAT_DAMPING.maxMultiplier, 1 + REPEAT_DAMPING.factor * (f.count - 1));
    scores[f.cat] = (scores[f.cat] ?? 100) - f.base * f.weight * multiplier;
  }

  for (const cat of categories) {
    scores[cat] = Math.max(SCORE_BOUNDS.min, Math.min(SCORE_BOUNDS.max, Math.round(scores[cat] ?? 100)));
  }

  let weightSum = 0;
  let weighted = 0;
  for (const cat of categories) {
    const w = CATEGORY_WEIGHTS[cat] ?? 1;
    weightSum += w;
    weighted += (scores[cat] ?? 100) * w;
  }
  const health = Math.round(weighted / Math.max(1, weightSum));
  return { ...scores, health } as ScoreSet;
}
