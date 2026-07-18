import { defineRule } from "@/lib/rules/types";

export default defineRule({
  id: "seo-title-unique",
  name: "Title tags are unique across pages",
  category: "SEO",
  checkClass: "critical",
  failSeverity: "critical",
  scoreCategory: "seo",
  appliesTo: "site",
  issue: {
    title: (r) => `Duplicate title tag on ${String(r.details)} pages`,
    description: (r) => `Multiple pages share the same <title>: ${r.evidence ?? ""}`.slice(0, 400),
    businessImpact:
      "Search engines cannot tell duplicate-titled pages apart and may index only one — the rest lose their rankings.",
    fix: "Give each page a unique, descriptive title under 60 characters.",
    effort: "low",
  },
  evaluate: (ctx) => {
    const pages = ctx.allPages.filter((p) => p.title && p.title.trim());
    if (pages.length < 2) return { status: "not-evaluated", evidence: "fewer than 2 titled pages crawled" };
    const byTitle = new Map<string, string[]>();
    for (const p of pages) {
      const t = (p.title as string).trim();
      byTitle.set(t, [...(byTitle.get(t) ?? []), p.finalUrl]);
    }
    const dups = [...byTitle.entries()].filter(([, urls]) => urls.length > 1);
    if (dups.length > 0) {
      const affected = dups.reduce((a, [, urls]) => a + urls.length, 0);
      const ev = dups.map(([t, urls]) => `"${t.slice(0, 60)}" on ${urls.length} pages (${urls.slice(0, 3).join(", ")})`).join("; ");
      return { status: "fail", evidence: ev, details: affected };
    }
    return { status: "pass", evidence: `all ${pages.length} page titles unique` };
  },
});
