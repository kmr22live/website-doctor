import { defineRule } from "@/lib/rules/types";

export default defineRule({
  id: "seo-favicon",
  name: "Favicon declared",
  category: "SEO",
  checkClass: "notice",
  failSeverity: "low",
  scoreCategory: "ux",
  appliesTo: "page",
  issue: {
    title: "No favicon declared",
    description: (_r, ctx) =>
      `${ctx.page.finalUrl} declares no favicon link. Browser tabs, bookmarks, and Google result pages show a generic icon.`,
    businessImpact: "A missing favicon is a small but visible brand-polish gap everywhere your site is listed.",
    fix: "Add a favicon and standard touch icons to the <head>.",
    code: '<link rel="icon" href="/favicon.ico" sizes="32x32">\n<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    effort: "low",
  },
  evaluate: (ctx) => {
    if (ctx.page.favicon) return { status: "pass", evidence: `favicon: ${ctx.page.favicon}` };
    return { status: "fail", evidence: "no <link rel=icon> found" };
  },
});
