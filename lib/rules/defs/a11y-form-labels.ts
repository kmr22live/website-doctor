import { defineRule } from "@/lib/rules/types";

export default defineRule({
  id: "a11y-form-labels",
  name: "Form elements have labels",
  category: "Accessibility",
  checkClass: "critical",
  failSeverity: "critical",
  scoreCategory: "accessibility",
  appliesTo: "page",
  issue: {
    title: (r) => `${String(r.details)} form input(s) have no label`,
    description: (r, ctx) =>
      `${ctx.page.finalUrl} has ${String(r.details)} form input(s) with no associated <label>, aria-label, or wrapping label. Screen readers announce them as unlabeled fields.`,
    businessImpact:
      "Users of assistive technology cannot complete these forms — direct loss of enquiries/conversions and an ADA/EAA compliance risk.",
    fix: "Associate a visible or visually-hidden label with each input.",
    code: '<label for="email">Email address</label>\n<input id="email" type="email" name="email" required>',
    effort: "low",
  },
  evaluate: (ctx) => {
    const forms = ctx.page.forms;
    if (forms.length === 0 || forms.every((f) => f.inputCount === 0))
      return { status: "not-evaluated", evidence: "no form inputs on page" };
    const missing = forms.reduce((a, f) => a + f.inputsWithoutLabel, 0);
    if (missing > 0)
      return { status: "fail", evidence: `${missing} inputs without labels across ${forms.length} form(s)`, details: missing, affected: ctx.page.samples.unlabeledInputs };
    return { status: "pass", evidence: "all form inputs labeled" };
  },
});
