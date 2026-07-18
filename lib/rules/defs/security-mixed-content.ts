import { defineRule } from "@/lib/rules/types";

export default defineRule({
  id: "security-mixed-content",
  name: "No mixed content (HTTP assets on HTTPS page)",
  category: "Security",
  checkClass: "critical",
  failSeverity: "high",
  scoreCategory: "best-practices",
  appliesTo: "page",
  issue: {
    title: (r) => `${String(r.details)} insecure HTTP asset(s) on HTTPS page`,
    description: (r, ctx) =>
      `${ctx.page.finalUrl} is served over HTTPS but loads ${String(r.details)} asset(s) over plain HTTP. Browsers block active mixed content and mark the page as not fully secure.`,
    businessImpact:
      "Blocked scripts/styles silently break features, and the 'not secure' indicator destroys trust exactly where you ask users to act.",
    fix: "Serve every asset over HTTPS (protocol-relative or absolute https:// URLs).",
    code: '<script src="https://cdn.example.com/lib.js"></script>',
    effort: "low",
  },
  evaluate: (ctx) => {
    if (!ctx.page.finalUrl.startsWith("https://"))
      return { status: "not-evaluated", evidence: "page not served over HTTPS" };
    const n = ctx.page.mixedContentUrls.length;
    if (n > 0)
      return { status: "fail", evidence: `${n} HTTP assets, e.g. ${ctx.page.mixedContentUrls.slice(0, 3).join(", ")}`, details: n };
    return { status: "pass", evidence: "no mixed content detected" };
  },
});
