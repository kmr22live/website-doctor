import { defineRule } from "@/lib/rules/types";

export default defineRule({
  id: "forms-required-attributes",
  name: "Forms use native validation attributes",
  category: "Forms",
  checkClass: "warning",
  failSeverity: "medium",
  scoreCategory: "conversion",
  appliesTo: "page",
  issue: {
    title: "Form fields lack native validation attributes",
    description: (r, ctx) =>
      `On ${ctx.page.finalUrl}, ${String(r.details)} form input(s) have no required/aria-required attribute. Users discover mistakes only after submitting.`,
    businessImpact:
      "Every failed submission is a lead that may not retry — inline validation is table stakes for conversion forms.",
    fix: "Add native validation attributes so the browser flags problems inline.",
    code: '<input type="email" name="email" required autocomplete="email">',
    effort: "low",
  },
  evaluate: (ctx) => {
    const forms = ctx.page.forms.filter((f) => f.inputCount > 0);
    if (forms.length === 0) return { status: "not-evaluated", evidence: "no forms with inputs on page" };
    const allWithout = forms.reduce((a, f) => a + f.inputsWithoutRequired, 0);
    const allInputs = forms.reduce((a, f) => a + f.inputCount, 0);
    // Fail only when NO input in any form declares validation — heuristics stay conservative.
    if (allWithout === allInputs)
      return { status: "fail", evidence: `none of ${allInputs} inputs declare required`, details: allWithout };
    return { status: "pass", evidence: `${allInputs - allWithout} of ${allInputs} inputs declare validation` };
  },
});
