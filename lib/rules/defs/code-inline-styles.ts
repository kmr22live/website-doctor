import { defineRule } from "@/lib/rules/types";

const THRESHOLD = 10;

export default defineRule({
  id: "code-inline-styles",
  name: "Inline style attributes kept minimal",
  category: "Code quality",
  checkClass: "notice",
  failSeverity: "low",
  scoreCategory: "best-practices",
  appliesTo: "page",
  issue: {
    title: (r) => `${String(r.details)} elements use inline style attributes`,
    description: (r, ctx) =>
      `${ctx.page.finalUrl} has ${String(r.details)} elements with style="…" attributes. Heavy inline styling bloats HTML, defeats caching, and makes consistent theming hard.`,
    businessImpact:
      "Style scattered through markup slows page weight and multiplies the cost of every future design change.",
    fix: "Move repeated inline styles into stylesheet classes.",
    effort: "medium",
  },
  evaluate: (ctx) => {
    const n = ctx.page.inlineStyleCount;
    if (n > THRESHOLD) return { status: "fail", evidence: `${n} elements with style attributes (threshold ${THRESHOLD})`, details: n, affected: ctx.page.samples.inlineStyles };
    if (n > 0) return { status: "warning", evidence: `${n} elements with style attributes` };
    return { status: "pass", evidence: "no inline style attributes" };
  },
});
