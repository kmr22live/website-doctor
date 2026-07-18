import { defineRule } from "@/lib/rules/types";

export default defineRule({
  id: "code-deprecated-tags",
  name: "No deprecated HTML tags",
  category: "Code quality",
  checkClass: "warning",
  failSeverity: "medium",
  scoreCategory: "best-practices",
  appliesTo: "page",
  issue: {
    title: (r) => `Deprecated HTML tags in use: ${String(r.details)}`,
    description: (r, ctx) =>
      `${ctx.page.finalUrl} still uses deprecated tags (${String(r.details)}). Browsers render them inconsistently and they signal legacy, unmaintained markup.`,
    businessImpact:
      "Deprecated markup risks breakage in future browsers and drags down code-quality signals that audits and some crawlers assess.",
    fix: "Replace deprecated tags with semantic HTML + CSS (e.g. <center> → CSS text-align/flexbox).",
    effort: "medium",
  },
  evaluate: (ctx) => {
    const tags = ctx.page.deprecatedTags;
    if (tags.length > 0)
      return { status: "fail", evidence: `deprecated tags found: ${tags.join(", ")}`, details: tags.join(", "), affected: ctx.page.samples.deprecatedTags };
    return { status: "pass", evidence: "no deprecated tags" };
  },
});
