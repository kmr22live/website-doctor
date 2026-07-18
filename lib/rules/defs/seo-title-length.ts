import { defineRule } from "@/lib/rules/types";

export default defineRule({
  id: "seo-title-length",
  name: "Title length is 10–60 characters",
  category: "SEO",
  checkClass: "warning",
  failSeverity: "medium",
  scoreCategory: "seo",
  appliesTo: "page",
  issue: {
    title: (r) => `Title length problem (${r.details as string})`,
    description: (r, ctx) =>
      `The title on ${ctx.page.finalUrl} is ${String(r.details)}: "${(ctx.page.title ?? "").slice(0, 90)}". Google truncates titles over ~60 characters and tends to rewrite very short ones.`,
    businessImpact:
      "A truncated or rewritten title costs click-through from search results — the snippet no longer says what you chose.",
    fix: "Rewrite the title to 10–60 characters, front-loading the primary keyword.",
    effort: "low",
  },
  evaluate: (ctx) => {
    const t = ctx.page.title?.trim() ?? "";
    if (!t) return { status: "not-evaluated", evidence: "no title to measure" };
    if (t.length < 10) return { status: "fail", evidence: `title is ${t.length} chars`, details: `${t.length} chars — too short` };
    if (t.length > 60) return { status: "fail", evidence: `title is ${t.length} chars`, details: `${t.length} chars — too long` };
    return { status: "pass", evidence: `title is ${t.length} chars` };
  },
});
