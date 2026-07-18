import { defineRule } from "@/lib/rules/types";

export default defineRule({
  id: "seo-meta-description-length",
  name: "Meta description length is 50–160 characters",
  category: "SEO",
  checkClass: "notice",
  failSeverity: "low",
  scoreCategory: "seo",
  appliesTo: "page",
  issue: {
    title: (r) => `Meta description length problem (${r.details as string})`,
    description: (r, ctx) =>
      `The meta description on ${ctx.page.finalUrl} is ${String(r.details)}. Google truncates snippets around 160 characters and may ignore very short ones.`,
    businessImpact: "A truncated or thin snippet weakens your pitch on the results page and lowers click-through.",
    fix: "Rewrite the description to 50–160 characters with a clear value proposition.",
    effort: "low",
  },
  evaluate: (ctx) => {
    const d = ctx.page.metaDescription?.trim() ?? "";
    if (!d) return { status: "not-evaluated", evidence: "no description to measure" };
    if (d.length < 50) return { status: "fail", evidence: `description is ${d.length} chars`, details: `${d.length} chars — too short` };
    if (d.length > 160) return { status: "fail", evidence: `description is ${d.length} chars`, details: `${d.length} chars — too long` };
    return { status: "pass", evidence: `description is ${d.length} chars` };
  },
});
