import { defineRule } from "@/lib/rules/types";

export default defineRule({
  id: "code-console-errors",
  name: "No JavaScript console errors on load",
  category: "Code quality",
  checkClass: "critical",
  failSeverity: "medium",
  scoreCategory: "best-practices",
  appliesTo: "page",
  dataSource: "crawler",
  issue: {
    title: (r) => `${String(r.details)} JavaScript console error(s) on load`,
    description: (r, ctx) =>
      `Loading ${ctx.page.finalUrl} produced ${String(r.details)} console error(s), e.g.: ${(ctx.consoleErrors[0] ?? "").slice(0, 200)}`,
    businessImpact:
      "Console errors usually mean something on the page silently failed — features users depend on may simply not work.",
    fix: "Reproduce in DevTools, fix the underlying exceptions, and add error monitoring so regressions surface.",
    effort: "medium",
  },
  evaluate: (ctx) => {
    const n = ctx.consoleErrors.length;
    if (n > 0)
      return { status: "fail", evidence: `${n} console errors, first: ${ctx.consoleErrors[0]?.slice(0, 150)}`, details: n };
    return { status: "pass", evidence: "no console errors during load" };
  },
});
