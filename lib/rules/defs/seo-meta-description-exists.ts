import { defineRule } from "@/lib/rules/types";

export default defineRule({
  id: "seo-meta-description-exists",
  name: "Meta description exists",
  category: "SEO",
  checkClass: "warning",
  failSeverity: "high",
  scoreCategory: "seo",
  appliesTo: "page",
  issue: {
    title: "Missing meta description",
    description: (_r, ctx) =>
      `${ctx.page.finalUrl} has no meta description. Search engines generate an arbitrary snippet from page text instead.`,
    businessImpact:
      "The search snippet is your ad copy on Google. A missing description measurably lowers click-through from search results.",
    fix: "Add a compelling 150–160 character description to the page <head>.",
    code: '<meta name="description" content="One-sentence pitch of this page — what it offers and why to click.">',
    effort: "low",
  },
  evaluate: (ctx) => {
    const d = ctx.page.metaDescription;
    if (d && d.trim().length > 0) return { status: "pass", evidence: `description: "${d.slice(0, 80)}…"` };
    return { status: "fail", evidence: "no meta description found" };
  },
});
