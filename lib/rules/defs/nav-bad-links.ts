import { defineRule } from "@/lib/rules/types";

export default defineRule({
  id: "nav-bad-links",
  name: "No empty, #, or javascript: links",
  category: "Navigation",
  checkClass: "warning",
  failSeverity: "medium",
  scoreCategory: "ux",
  appliesTo: "page",
  issue: {
    title: (r) => `${String(r.details)} dead link target(s) (empty / # / javascript:)`,
    description: (r, ctx) =>
      `${ctx.page.finalUrl} contains ${String(r.details)} anchor(s) whose href is empty, "#", or a javascript: pseudo-URL. These look like links but lead nowhere.`,
    businessImpact:
      "Dead links break keyboard navigation, confuse crawlers, and erode user trust when a click does nothing.",
    fix: "Point each anchor at a real URL, or use a <button> for JavaScript-only actions.",
    code: '<button type="button" onClick={...}>Action</button>\n<!-- instead of <a href="#"> -->',
    effort: "low",
  },
  evaluate: (ctx) => {
    const bad = ctx.page.links.filter((l) => {
      const h = l.href.trim().toLowerCase();
      return h === "" || h === "#" || h.startsWith("javascript:");
    });
    if (ctx.page.links.length === 0) return { status: "not-evaluated", evidence: "no links on page" };
    if (bad.length > 0)
      return { status: "fail", evidence: `${bad.length} bad hrefs, e.g. ${bad.slice(0, 3).map((l) => `"${l.href}" (${l.text.slice(0, 30) || "no text"})`).join(", ")}`, details: bad.length, affected: ctx.page.samples.badLinks };
    return { status: "pass", evidence: `all ${ctx.page.links.length} links have real targets` };
  },
});
