import { describe, expect, it } from "vitest";
import { runRules, listRules, buildIssueCopy } from "@/lib/rules/engine";
import { healthyPage } from "./fixtures";
import type { PageInput } from "@/lib/rules/engine";

function input(overrides: Parameters<typeof healthyPage>[0] = {}, pageId = "p1"): PageInput {
  return {
    pageId,
    extracted: healthyPage(overrides),
    headers: { "content-type": "text/html" },
    consoleErrors: [],
  };
}

describe("rule engine", () => {
  it("discovers rules via the generated barrel", () => {
    expect(listRules().length).toBeGreaterThanOrEqual(25);
    const ids = listRules().map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length); // unique ids
  });

  it("passes a healthy page on the core checks", () => {
    const results = runRules([input()]);
    const byId = new Map(results.map((r) => [r.rule.id, r.result.status]));
    expect(byId.get("seo-title-exists")).toBe("pass");
    expect(byId.get("seo-meta-description-exists")).toBe("pass");
    expect(byId.get("seo-canonical-present")).toBe("pass");
    expect(byId.get("mobile-viewport-meta")).toBe("pass");
    expect(byId.get("a11y-image-alt")).toBe("pass");
    expect(byId.get("content-h1-count")).toBe("pass");
    expect(byId.get("code-doctype")).toBe("pass");
  });

  it("fails the right checks on a broken page", () => {
    const results = runRules([
      input({
        title: null,
        titleCount: 0,
        metaDescription: null,
        metaDescriptionCount: 0,
        viewport: null,
        viewportCount: 0,
        images: [{ src: "x.jpg", alt: null, width: null, height: null, loading: null }],
        headings: [],
        robotsMeta: "noindex",
        hasDoctype: false,
      }),
    ]);
    const byId = new Map(results.map((r) => [r.rule.id, r.result.status]));
    expect(byId.get("seo-title-exists")).toBe("fail");
    expect(byId.get("seo-meta-description-exists")).toBe("fail");
    expect(byId.get("mobile-viewport-meta")).toBe("fail");
    expect(byId.get("a11y-image-alt")).toBe("fail");
    expect(byId.get("content-h1-count")).toBe("fail");
    expect(byId.get("seo-robots-indexable")).toBe("fail");
    expect(byId.get("code-doctype")).toBe("fail");
  });

  it("detects duplicate titles across pages (site rule)", () => {
    const results = runRules([
      input({ finalUrl: "https://example.com/a" }, "p1"),
      input({ finalUrl: "https://example.com/b" }, "p2"),
    ]);
    const dup = results.find((r) => r.rule.id === "seo-title-unique");
    expect(dup?.result.status).toBe("fail");
    expect(dup?.pageId).toBeNull();
  });

  it("builds issue copy with evidence for every failing rule", () => {
    const broken = input({ title: null, titleCount: 0 });
    const results = runRules([broken]);
    const failed = results.filter((r) => r.result.status === "fail");
    for (const f of failed) {
      const copy = buildIssueCopy(f.rule, f.result, {
        page: broken.extracted,
        headers: broken.headers,
        consoleErrors: [],
        allPages: [broken.extracted],
      });
      expect(copy.title.length).toBeGreaterThan(3);
      expect(copy.description.length).toBeGreaterThan(10);
      expect(copy.businessImpact.length).toBeGreaterThan(10);
      expect(copy.fix.length).toBeGreaterThan(5);
    }
  });

  it("never throws — a crashing rule yields the honest 'error' status", () => {
    // headings undefined would crash naive rules; extractor guarantees arrays,
    // but the engine must survive malformed data anyway.
    const bad = input();
    (bad.extracted as unknown as { headings: null }).headings = null;
    const results = runRules([bad]);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(["pass", "fail", "warning", "not-evaluated", "error"]).toContain(r.result.status);
    }
    // and at least one rule actually hit the crash path
    expect(results.some((r) => r.result.status === "error")).toBe(true);
  });
});
