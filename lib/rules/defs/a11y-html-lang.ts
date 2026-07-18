import { defineRule } from "@/lib/rules/types";

export default defineRule({
  id: "a11y-html-lang",
  name: "HTML lang attribute set",
  category: "Accessibility",
  checkClass: "warning",
  failSeverity: "medium",
  scoreCategory: "accessibility",
  appliesTo: "page",
  issue: {
    title: "Missing lang attribute on <html>",
    description: (_r, ctx) =>
      `${ctx.page.finalUrl} does not declare a language on its <html> element. Screen readers guess the pronunciation rules and often guess wrong.`,
    businessImpact:
      "Mispronounced content is exhausting for screen-reader users, and lang is one of the most-checked WCAG basics in accessibility audits.",
    fix: "Declare the document language on the html element.",
    code: '<html lang="en">',
    effort: "low",
  },
  evaluate: (ctx) => {
    if (ctx.page.htmlLang && ctx.page.htmlLang.trim())
      return { status: "pass", evidence: `lang="${ctx.page.htmlLang}"` };
    return { status: "fail", evidence: "no lang attribute on <html>" };
  },
});
