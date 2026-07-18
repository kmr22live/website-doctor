/** Canonical 15-stage pipeline (names match the design contract). */
export const STAGES = [
  { id: "crawl", name: "Crawl website", icon: "travel_explore", detail: "Opening pages, waiting for network idle" },
  { id: "discover", name: "Discover pages", icon: "account_tree", detail: "Following internal links, deduplicating URLs" },
  { id: "screenshots", name: "Capture screenshots", icon: "photo_camera", detail: "Viewport captures per page" },
  { id: "extract", name: "Extract HTML & metadata", icon: "code", detail: "Titles, meta, headings, images, forms, schema" },
  { id: "lighthouse", name: "Lighthouse audit", icon: "speed", detail: "Performance, SEO, best practices per page" },
  { id: "axe", name: "Accessibility scan", icon: "accessibility_new", detail: "axe-core: ARIA, labels, contrast, keyboard" },
  { id: "security", name: "Security headers & TLS", icon: "https", detail: "CSP, HSTS, cookies, certificate, TLS version" },
  { id: "code-validation", name: "Code validation", icon: "data_object", detail: "Console errors, broken links, library checks" },
  { id: "search-console", name: "Search Console sync", icon: "query_stats", detail: "Optional — skipped when not connected" },
  { id: "rules", name: "Rule engine", icon: "rule", detail: "Running automated checks across categories" },
  { id: "ai-vision", name: "AI vision review", icon: "visibility", detail: "Senior-UX review of every screenshot" },
  { id: "ai-html", name: "AI HTML review", icon: "psychology", detail: "Frontend-QA review of markup and metadata" },
  { id: "cross-page", name: "Cross-page consistency", icon: "compare", detail: "Header, footer, buttons, CTA wording" },
  { id: "fixes", name: "Generate fixes", icon: "auto_fix_high", detail: "Drafting code and copy for each issue" },
  { id: "scores", name: "Calculate scores", icon: "calculate", detail: "Weighing issues into category scores" },
] as const;

export type StageId = (typeof STAGES)[number]["id"];

export function stageIndex(id: StageId): number {
  return STAGES.findIndex((s) => s.id === id);
}
