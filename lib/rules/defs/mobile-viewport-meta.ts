import { defineRule } from "@/lib/rules/types";

export default defineRule({
  id: "mobile-viewport-meta",
  name: "Viewport meta tag in <head>",
  category: "SEO",
  checkClass: "critical",
  failSeverity: "high",
  scoreCategory: "ux",
  appliesTo: "page",
  issue: {
    title: "Missing viewport meta tag",
    description: (_r, ctx) =>
      `${ctx.page.finalUrl} has no <meta name="viewport"> tag. Mobile browsers render it at desktop width and scale it down to fit.`,
    businessImpact:
      "The page is effectively unusable on phones — tiny text, horizontal scrolling — and Google's mobile-first indexing penalizes it.",
    fix: "Add the standard responsive viewport tag to the page <head>.",
    code: '<meta name="viewport" content="width=device-width, initial-scale=1">',
    effort: "low",
  },
  evaluate: (ctx) => {
    if (ctx.page.viewportCount > 1)
      return { status: "fail", evidence: `${ctx.page.viewportCount} viewport meta tags found (must be exactly one)` };
    if (ctx.page.viewport) return { status: "pass", evidence: `viewport: "${ctx.page.viewport}"` };
    return { status: "fail", evidence: "no viewport meta tag found" };
  },
});
