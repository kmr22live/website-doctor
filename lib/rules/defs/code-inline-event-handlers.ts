import { defineRule } from "@/lib/rules/types";

export default defineRule({
  id: "code-inline-event-handlers",
  name: "No inline event handlers (onclick=…)",
  category: "Code quality",
  checkClass: "warning",
  failSeverity: "low",
  scoreCategory: "best-practices",
  appliesTo: "page",
  issue: {
    title: (r) => `${String(r.details)} inline event handler(s) in HTML`,
    description: (r, ctx) =>
      `${ctx.page.finalUrl} uses ${String(r.details)} inline event handler attribute(s) (onclick, onload, …). Inline handlers block strict Content-Security-Policy and scatter behavior through markup.`,
    businessImpact:
      "Inline handlers force an unsafe-inline CSP (a real XSS exposure) and make the codebase harder to audit and maintain.",
    fix: "Move handlers into scripts with addEventListener; then CSP can drop unsafe-inline.",
    code: "document.querySelector('#buy').addEventListener('click', onBuy);",
    effort: "medium",
  },
  evaluate: (ctx) => {
    const n = ctx.page.inlineEventHandlerCount;
    if (n > 0) return { status: "fail", evidence: `${n} inline event handler attributes`, details: n, affected: ctx.page.samples.inlineHandlers };
    return { status: "pass", evidence: "no inline event handlers" };
  },
});
