import { defineRule } from "@/lib/rules/types";

export default defineRule({
  id: "content-h1-count",
  name: "Exactly one H1 per page",
  category: "Content",
  checkClass: "warning",
  failSeverity: "medium",
  scoreCategory: "seo",
  appliesTo: "page",
  issue: {
    title: (r) => (r.details === 0 ? "H1 heading is missing" : `Multiple H1 headings (${String(r.details)})`),
    description: (r, ctx) =>
      r.details === 0
        ? `${ctx.page.finalUrl} has no H1. The main heading tells users and search engines what the page is about.`
        : `${ctx.page.finalUrl} has ${String(r.details)} H1 headings. Multiple H1s dilute the page's topical focus and confuse screen-reader document outlines.`,
    businessImpact:
      "The H1 anchors both SEO relevance and the visual hierarchy; getting it wrong weakens rankings and scannability.",
    fix: "Use exactly one H1 that states the page's primary topic; demote the rest to H2/H3.",
    code: "<h1>Primary page topic</h1>",
    effort: "low",
  },
  evaluate: (ctx) => {
    const n = ctx.page.headings.filter((h) => h.level === 1).length;
    if (n === 1) return { status: "pass", evidence: "exactly one H1" };
    return { status: "fail", evidence: `${n} H1 headings found`, details: n };
  },
});
