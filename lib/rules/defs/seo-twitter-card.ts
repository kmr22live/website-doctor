import { defineRule } from "@/lib/rules/types";

export default defineRule({
  id: "seo-twitter-card",
  name: "Twitter card tags present",
  category: "SEO",
  checkClass: "notice",
  failSeverity: "low",
  scoreCategory: "seo",
  appliesTo: "page",
  issue: {
    title: "Twitter card tags missing",
    description: (_r, ctx) =>
      `${ctx.page.finalUrl} declares no twitter:card meta tags. Shares on X/Twitter fall back to a plain link (or to Open Graph if present).`,
    businessImpact: "Rich cards earn measurably more engagement than bare links on X/Twitter.",
    fix: "Add Twitter card tags alongside your Open Graph tags.",
    code: '<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="Page title">\n<meta name="twitter:image" content="https://example.com/og-image.jpg">',
    effort: "low",
  },
  evaluate: (ctx) => {
    if (Object.keys(ctx.page.twitterTags).length === 0)
      return { status: "fail", evidence: "no twitter: meta tags found" };
    if (!ctx.page.twitterTags["twitter:card"])
      return { status: "fail", evidence: `twitter tags present but twitter:card missing (${Object.keys(ctx.page.twitterTags).join(", ")})` };
    return { status: "pass", evidence: `twitter:card = ${ctx.page.twitterTags["twitter:card"]}` };
  },
});
