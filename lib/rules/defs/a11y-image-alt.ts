import { defineRule } from "@/lib/rules/types";

export default defineRule({
  id: "a11y-image-alt",
  name: "Every image has alt text",
  category: "Accessibility",
  checkClass: "warning",
  failSeverity: "high",
  scoreCategory: "accessibility",
  appliesTo: "page",
  issue: {
    title: (r) => `${String(r.details)} image(s) missing alt text`,
    description: (r, ctx) =>
      `${ctx.page.finalUrl} has ${String(r.details)} <img> element(s) with a missing alt attribute. Screen readers announce these as unlabeled graphics.`,
    businessImpact:
      "Screen-reader users get nothing from these images, and image search cannot index them — lost accessibility compliance and a lost discovery channel.",
    fix: "Add descriptive alt text to meaningful images; use alt=\"\" only for purely decorative ones.",
    code: '<img src="photo.jpg" alt="Concise description of what the image shows">',
    effort: "medium",
  },
  evaluate: (ctx) => {
    const imgs = ctx.page.images;
    if (imgs.length === 0) return { status: "not-evaluated", evidence: "no images on page" };
    const missing = imgs.filter((i) => i.alt === null).length;
    if (missing > 0)
      return { status: "fail", evidence: `${missing} of ${imgs.length} images missing alt attribute`, details: missing, affected: ctx.page.samples.missingAlt };
    return { status: "pass", evidence: `all ${imgs.length} images have alt attributes` };
  },
});
