import { defineRule } from "@/lib/rules/types";

export default defineRule({
  id: "seo-title-exists",
  name: "Title tag exists",
  category: "SEO",
  checkClass: "critical",
  failSeverity: "critical",
  scoreCategory: "seo",
  appliesTo: "page",
  issue: {
    title: "Missing title tag",
    description: (_r, ctx) =>
      `The page ${ctx.page.finalUrl} has no <title> tag (or it is empty). Search engines show the URL or arbitrary text as the result headline.`,
    businessImpact:
      "The title is the single strongest on-page ranking signal and your headline on Google. Without it the page competes with a blank flag.",
    fix: "Add a unique, descriptive title under 60 characters to the page <head>.",
    code: "<title>Page name | Brand</title>",
    effort: "low",
  },
  evaluate: (ctx) => {
    const t = ctx.page.title;
    if (t && t.trim().length > 0) {
      return { status: "pass", evidence: `title: "${t.slice(0, 80)}"` };
    }
    return { status: "fail", evidence: "no <title> tag found or title is empty" };
  },
});
