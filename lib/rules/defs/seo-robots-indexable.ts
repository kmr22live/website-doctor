import { defineRule } from "@/lib/rules/types";

export default defineRule({
  id: "seo-robots-indexable",
  name: "Page is indexable (no noindex)",
  category: "SEO",
  checkClass: "critical",
  failSeverity: "critical",
  scoreCategory: "seo",
  appliesTo: "page",
  issue: {
    title: "Page is blocked from indexing (noindex)",
    description: (r, ctx) =>
      `${ctx.page.finalUrl} carries a noindex directive (${String(r.details)}). Search engines will drop it from their index entirely.`,
    businessImpact:
      "A noindexed page earns zero organic traffic no matter how good its content is. If this is unintentional it is the single most damaging SEO problem a page can have.",
    fix: "Remove the noindex directive from the meta robots tag (or the X-Robots-Tag header) if the page should rank.",
    code: '<meta name="robots" content="index, follow">',
    effort: "low",
  },
  evaluate: (ctx) => {
    const sources: string[] = [];
    const meta = ctx.page.robotsMeta?.toLowerCase() ?? "";
    if (meta.includes("noindex")) sources.push(`meta robots: "${ctx.page.robotsMeta}"`);
    const headerVal = ctx.headers["x-robots-tag"]?.toLowerCase() ?? "";
    if (headerVal.includes("noindex")) sources.push(`X-Robots-Tag header: "${ctx.headers["x-robots-tag"]}"`);
    if (sources.length > 0)
      return { status: "fail", evidence: sources.join("; "), details: sources.join("; ") };
    return { status: "pass", evidence: meta ? `meta robots: "${ctx.page.robotsMeta}"` : "no restrictive robots directives" };
  },
});
