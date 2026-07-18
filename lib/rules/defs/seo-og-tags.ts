import { defineRule } from "@/lib/rules/types";

const REQUIRED = ["og:title", "og:description", "og:image"];

export default defineRule({
  id: "seo-og-tags",
  name: "Open Graph tags present",
  category: "SEO",
  checkClass: "notice",
  failSeverity: "medium",
  scoreCategory: "seo",
  appliesTo: "page",
  issue: {
    title: "Open Graph tags missing",
    description: (r, ctx) =>
      `${ctx.page.finalUrl} is missing ${String(r.details)}. Links shared on WhatsApp, Facebook, LinkedIn or Slack render as bare URLs instead of rich cards.`,
    businessImpact:
      "Shared links without a preview card get fewer clicks — every share is a weaker referral than it could be.",
    fix: "Add Open Graph tags to every page.",
    code: '<meta property="og:title" content="Page title">\n<meta property="og:description" content="One-line description">\n<meta property="og:image" content="https://example.com/og-image.jpg">',
    effort: "low",
  },
  evaluate: (ctx) => {
    const missing = REQUIRED.filter((k) => !ctx.page.ogTags[k]);
    if (missing.length === REQUIRED.length)
      return { status: "fail", evidence: "no Open Graph tags found", details: "all Open Graph tags (og:title, og:description, og:image)" };
    if (missing.length > 0)
      return { status: "fail", evidence: `missing: ${missing.join(", ")}`, details: missing.join(", ") };
    return { status: "pass", evidence: `all required OG tags present (${Object.keys(ctx.page.ogTags).length} total)` };
  },
});
