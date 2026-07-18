import { defineRule } from "@/lib/rules/types";

export default defineRule({
  id: "content-heading-hierarchy",
  name: "Heading hierarchy has no skipped levels",
  category: "Content",
  checkClass: "warning",
  failSeverity: "low",
  scoreCategory: "accessibility",
  appliesTo: "page",
  issue: {
    title: "Heading hierarchy is broken",
    description: (r, ctx) =>
      `On ${ctx.page.finalUrl} the heading levels skip: ${String(r.details)}. Screen-reader users navigate by heading level and lose their place when levels jump.`,
    businessImpact:
      "A broken outline makes the page harder to skim for assistive-tech users and weakens the semantic structure search engines read.",
    fix: "Nest headings sequentially (H1 → H2 → H3) without skipping levels.",
    effort: "low",
  },
  evaluate: (ctx) => {
    const hs = ctx.page.headings;
    if (hs.length === 0) return { status: "not-evaluated", evidence: "no headings on page" };
    const skips: string[] = [];
    let prev = 0;
    for (const h of hs) {
      if (prev > 0 && h.level > prev + 1) skips.push(`H${prev} → H${h.level} ("${h.text.slice(0, 40)}")`);
      prev = h.level;
    }
    if (skips.length > 0) return { status: "fail", evidence: skips.join("; "), details: skips.slice(0, 3).join("; ") };
    return { status: "pass", evidence: `${hs.length} headings, levels sequential` };
  },
});
