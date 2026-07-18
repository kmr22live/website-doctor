import { describe, expect, it } from "vitest";
import { extractPage } from "@/lib/services/extractor";
import { runRules } from "@/lib/rules/engine";
import { capAffected, AFFECTED_CAP, AFFECTED_HTML_MAX } from "@/lib/rules/types";
import { healthyPage } from "./fixtures";

const BROKEN_HTML = `<!doctype html>
<html lang="en"><head><title>Broken page title for tests</title>
<meta name="description" content="A description long enough to satisfy the length rule for testing purposes here.">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="https://example.test/">
<script src="https://cdn.example.test/blocking.js"></script>
</head><body>
<h1>Main</h1>
<img src="/a.jpg" class="hero-img">
<img src="/b.jpg" id="promo">
<a href="#" class="btn primary">Click me</a>
<a href="javascript:void(0)">Legacy</a>
<div onclick="doThing()" class="card">Card</div>
<center>Old school</center>
<form><input type="text" name="q" class="search-box"><button type="submit">Go</button></form>
</body></html>`;

describe("affected elements (real page HTML in issues)", () => {
  const x = extractPage(BROKEN_HTML, "https://example.test/", "https://example.test/", 200);

  it("extractor captures offender samples with selector + real HTML", () => {
    expect(x.samples.missingAlt.length).toBe(2);
    expect(x.samples.missingAlt[0]?.html).toContain("hero-img");
    expect(x.samples.missingAlt[0]?.selector).toBe("img.hero-img");
    expect(x.samples.missingAlt[1]?.selector).toBe("img#promo");
    expect(x.samples.badLinks.length).toBe(2);
    expect(x.samples.badLinks[0]?.html).toContain('href="#"');
    expect(x.samples.inlineHandlers.length).toBe(1);
    expect(x.samples.inlineHandlers[0]?.html).toContain("onclick");
    expect(x.samples.deprecatedTags.length).toBe(1);
    expect(x.samples.deprecatedTags[0]?.html).toContain("<center>");
    expect(x.samples.unlabeledInputs.length).toBe(1);
    expect(x.samples.unlabeledInputs[0]?.html).toContain("search-box");
    expect(x.samples.blockingScripts.length).toBe(1);
    expect(x.samples.blockingScripts[0]?.html).toContain("blocking.js");
  });

  it("failing rules attach the affected elements to their result", () => {
    const results = runRules([{ pageId: "p1", extracted: x, headers: {}, consoleErrors: [] }]);
    const byId = new Map(results.map((r) => [r.rule.id, r]));
    expect(byId.get("a11y-image-alt")?.result.affected?.length).toBe(2);
    expect(byId.get("nav-bad-links")?.result.affected?.length).toBe(2);
    expect(byId.get("code-inline-event-handlers")?.result.affected?.[0]?.html).toContain("onclick");
    expect(byId.get("code-deprecated-tags")?.result.affected?.[0]?.html).toContain("center");
    expect(byId.get("a11y-form-labels")?.result.affected?.[0]?.html).toContain("search-box");
    expect(byId.get("perf-scripts-async-defer")?.result.affected?.[0]?.html).toContain("blocking.js");
  });

  it("passing rules attach nothing", () => {
    const clean = healthyPage();
    const results = runRules([{ pageId: "p1", extracted: clean, headers: {}, consoleErrors: [] }]);
    for (const r of results) {
      if (r.result.status === "pass") expect(r.result.affected ?? []).toHaveLength(0);
    }
  });

  it("capAffected enforces count and length caps", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ selector: "x".repeat(500), html: "y".repeat(1000) + i }));
    const capped = capAffected(many);
    expect(capped.length).toBe(AFFECTED_CAP);
    expect(capped[0]?.html.length).toBeLessThanOrEqual(AFFECTED_HTML_MAX);
    expect(capped[0]?.selector?.length).toBeLessThanOrEqual(120);
  });
});
