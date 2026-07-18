import { describe, expect, it } from "vitest";
import { runRules } from "@/lib/rules/engine";
import { computeScores } from "@/lib/services/scoring";
import { healthyPage } from "./fixtures";
import type { EvaluatedCheck, PageInput } from "@/lib/rules/engine";
import type { Rule } from "@/lib/rules/types";

function input(pageId = "p1"): PageInput {
  return { pageId, extracted: healthyPage(), headers: {}, consoleErrors: [] };
}

function errorCheck(scoreCategory: Rule["scoreCategory"]): EvaluatedCheck {
  const rule: Rule = {
    id: "x-err",
    name: "x",
    category: "SEO",
    checkClass: "warning",
    failSeverity: "critical",
    scoreCategory,
    appliesTo: "page",
    issue: { title: "t", description: "d", businessImpact: "b", fix: "f", effort: "low" },
    evaluate: () => ({ status: "pass" }),
  };
  return { rule, result: { status: "error", evidence: "boom" }, pageId: "p1" };
}

describe("error status (did not run properly — never fake)", () => {
  it("a crashing rule reports status 'error' with the crash as evidence", () => {
    const bad = input();
    (bad.extracted as unknown as { headings: null }).headings = null;
    const results = runRules([bad]);
    const errored = results.filter((r) => r.result.status === "error");
    expect(errored.length).toBeGreaterThan(0);
    for (const r of errored) {
      expect(r.result.evidence).toContain("rule crashed");
    }
  });

  it("error status never deducts from scores, even at critical severity", () => {
    const s = computeScores([errorCheck("performance")]);
    expect(s["performance"]).toBe(100);
    expect(s.health).toBe(100);
  });

  it("runRules ruleIds filter runs only the requested rule", () => {
    const results = runRules([input()], { ruleIds: ["seo-title-exists"] });
    expect(results.length).toBe(1);
    expect(results[0]?.rule.id).toBe("seo-title-exists");
  });
});
