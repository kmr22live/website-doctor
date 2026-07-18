import { defineRule } from "@/lib/rules/types";

export default defineRule({
  id: "track-analytics-present",
  name: "Analytics tag present (GA4 / GTM / FB pixel)",
  category: "Tracking",
  checkClass: "warning",
  failSeverity: "medium",
  scoreCategory: "conversion",
  appliesTo: "page",
  issue: {
    title: "No analytics tag detected",
    description: (_r, ctx) =>
      `No GA4, Google Tag Manager, or Facebook Pixel snippet was detected on ${ctx.page.finalUrl}. Visits to this page are invisible to your analytics.`,
    businessImpact:
      "You cannot attribute conversions or see what users do here — marketing decisions run on partial data.",
    fix: "Add your GA4 / GTM snippet to the shared layout template so every page is covered.",
    code: '<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>',
    effort: "low",
  },
  evaluate: (ctx) => {
    const found: string[] = [];
    if (ctx.page.hasGa4) found.push("GA4");
    if (ctx.page.hasGtm) found.push("GTM");
    if (ctx.page.hasFbPixel) found.push("FB Pixel");
    if (found.length > 0) return { status: "pass", evidence: `detected: ${found.join(", ")}` };
    return { status: "fail", evidence: "no GA4/GTM/FB-pixel snippets detected" };
  },
});
