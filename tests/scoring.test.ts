import { describe, expect, it } from "vitest";
import { computeScores } from "@/lib/services/scoring";
import { SEVERITY_DEDUCTIONS, REPEAT_DAMPING } from "@/config/scoring-weights";
import type { EvaluatedCheck } from "@/lib/rules/engine";
import type { Rule } from "@/lib/rules/types";

function check(id: string, severity: "critical" | "high" | "medium" | "low", scoreCategory: Rule["scoreCategory"], status: "pass" | "fail"): EvaluatedCheck {
  const rule: Rule = {
    id,
    name: id,
    category: "SEO",
    checkClass: "warning",
    failSeverity: severity,
    scoreCategory,
    appliesTo: "page",
    issue: { title: id, description: "d", businessImpact: "b", fix: "f", effort: "low" },
    evaluate: () => ({ status: "pass" }),
  };
  return { rule, result: { status }, pageId: "p1" };
}

describe("scoring engine", () => {
  it("returns 100 everywhere with no failures", () => {
    const s = computeScores([check("a", "high", "seo", "pass")]);
    expect(s["seo"]).toBe(100);
    expect(s.health).toBe(100);
  });

  it("deducts severity-weighted points per failed check", () => {
    const s = computeScores([check("a", "high", "seo", "fail"), check("b", "low", "seo", "fail")]);
    expect(s["seo"]).toBe(100 - SEVERITY_DEDUCTIONS["high"]! - SEVERITY_DEDUCTIONS["low"]!);
  });

  it("clamps scores at 0", () => {
    const many = Array.from({ length: 10 }, (_, i) => check(`c${i}`, "critical", "performance", "fail"));
    const s = computeScores(many);
    expect(s["performance"]).toBe(0);
  });

  it("damps repeated failures of the SAME rule across pages", () => {
    // Same rule failing on 10 pages = one underlying problem, capped deduction.
    const repeats = Array.from({ length: 10 }, () => check("same-rule", "medium", "performance", "fail"));
    const s = computeScores(repeats);
    const base = SEVERITY_DEDUCTIONS["medium"]!;
    expect(s["performance"]).toBe(Math.round(100 - base * REPEAT_DAMPING.maxMultiplier));
    // …while two DIFFERENT rules still deduct independently.
    const two = [check("rule-a", "medium", "performance", "fail"), check("rule-b", "medium", "performance", "fail")];
    expect(computeScores(two)["performance"]).toBe(100 - base * 2);
  });

  it("health is the mean of the six categories", () => {
    const s = computeScores([check("a", "critical", "seo", "fail")]);
    const cats = ["seo", "accessibility", "performance", "ux", "conversion", "best-practices"];
    const mean = Math.round(cats.reduce((a, c) => a + (s[c] ?? 0), 0) / cats.length);
    expect(s.health).toBe(mean);
  });

  it("applies per-rule weight multipliers from the config file", () => {
    // code-inline-styles has weight 0.5 in config/scoring-weights.ts
    const s = computeScores([check("code-inline-styles", "low", "best-practices", "fail")]);
    expect(s["best-practices"]).toBe(Math.round(100 - SEVERITY_DEDUCTIONS["low"]! * 0.5));
  });

  it("warnings and not-evaluated never deduct", () => {
    const warning = check("w", "critical", "seo", "pass");
    warning.result = { status: "warning" };
    const na = check("n", "critical", "seo", "pass");
    na.result = { status: "not-evaluated" };
    const s = computeScores([warning, na]);
    expect(s["seo"]).toBe(100);
  });
});
