import { defineRule } from "@/lib/rules/types";

export default defineRule({
  id: "code-doctype",
  name: "Page declares <!doctype html>",
  category: "Code quality",
  checkClass: "critical",
  failSeverity: "medium",
  scoreCategory: "best-practices",
  appliesTo: "page",
  issue: {
    title: "Missing <!doctype html> declaration",
    description: (_r, ctx) =>
      `${ctx.page.finalUrl} does not start with <!doctype html>. Browsers fall back to quirks mode, which changes box-model and layout behavior unpredictably.`,
    businessImpact:
      "Quirks-mode rendering differs between browsers — layouts that look fine in one can break in another.",
    fix: "Add the HTML5 doctype as the very first line of the document.",
    code: "<!doctype html>",
    effort: "low",
  },
  evaluate: (ctx) => {
    if (ctx.page.hasDoctype) return { status: "pass", evidence: "doctype present" };
    return { status: "fail", evidence: "document does not start with <!doctype html>" };
  },
});
