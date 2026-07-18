import { defineRule } from "@/lib/rules/types";

export default defineRule({
  id: "seo-canonical-present",
  name: "Canonical tag present",
  category: "SEO",
  checkClass: "warning",
  failSeverity: "medium",
  scoreCategory: "seo",
  appliesTo: "page",
  issue: {
    title: "Canonical tag is missing",
    description: (_r, ctx) =>
      `${ctx.page.finalUrl} declares no rel="canonical". If the page is reachable under multiple URLs (params, trailing slash, www), search engines may split its ranking signals.`,
    businessImpact:
      "Duplicate-URL variants dilute link equity and can cause the wrong URL to rank — or none at all.",
    fix: "Add a self-referencing canonical link to the page <head>.",
    code: (_r, ctx) => `<link rel="canonical" href="${ctx.page.finalUrl}">`,
    effort: "low",
  },
  evaluate: (ctx) => {
    if (ctx.page.canonicalCount > 1)
      return { status: "fail", evidence: `${ctx.page.canonicalCount} canonical tags found (must be exactly one)` };
    if (ctx.page.canonical) return { status: "pass", evidence: `canonical: ${ctx.page.canonical}` };
    return { status: "fail", evidence: "no canonical link found" };
  },
});
