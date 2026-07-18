import type { ScoreCategory } from "@/lib/types";

/**
 * Issue category → score category. Client-safe (no node deps) — used by the
 * scoring pipeline, rescore tooling, AND the dashboard so the "issues found"
 * counters agree with the deductions.
 */
export const CATEGORY_TO_SCORE: Record<string, ScoreCategory> = {
  SEO: "seo",
  Accessibility: "accessibility",
  Performance: "performance",
  UX: "ux",
  Conversion: "conversion",
  Security: "best-practices",
  "Code quality": "best-practices",
  Content: "seo",
  Forms: "conversion",
  Tracking: "conversion",
  Navigation: "seo",
};
