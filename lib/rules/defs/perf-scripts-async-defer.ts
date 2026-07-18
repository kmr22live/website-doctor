import { defineRule } from "@/lib/rules/types";

export default defineRule({
  id: "perf-scripts-async-defer",
  name: "External scripts use async or defer",
  category: "Performance",
  checkClass: "warning",
  failSeverity: "medium",
  scoreCategory: "performance",
  appliesTo: "page",
  issue: {
    title: (r) => `${String(r.details)} render-blocking external script(s)`,
    description: (r, ctx) =>
      `${ctx.page.finalUrl} loads ${String(r.details)} external script(s) without async or defer. Each one blocks HTML parsing until it downloads and executes.`,
    businessImpact:
      "Render-blocking scripts directly delay first paint — visitors stare at a blank page while third-party code loads.",
    fix: "Add defer (order-preserving) or async to every external script that isn't needed before first paint.",
    code: '<script src="app.js" defer></script>',
    effort: "low",
  },
  evaluate: (ctx) => {
    const ext = ctx.page.scripts.filter((s) => s.src && (s.type === null || s.type === "text/javascript" || s.type === "module"));
    if (ext.length === 0) return { status: "not-evaluated", evidence: "no external scripts" };
    const blocking = ext.filter((s) => !s.async && !s.defer && s.type !== "module");
    if (blocking.length > 0)
      return {
        status: "fail",
        evidence: `${blocking.length} of ${ext.length} external scripts render-blocking, e.g. ${blocking.slice(0, 3).map((s) => s.src).join(", ")}`,
        details: blocking.length,
        affected: ctx.page.samples.blockingScripts,
      };
    return { status: "pass", evidence: `all ${ext.length} external scripts async/defer/module` };
  },
});
