import { describe, expect, it } from "vitest";
import { runSecurity } from "@/lib/analyzers/security";
import { healthyPage } from "./fixtures";
import type { AnalyzerContext } from "@/lib/analyzers/types";
import type { FetchedPage } from "@/lib/services/fetcher";

function ctxWithHeaders(headers: Record<string, string>): AnalyzerContext {
  const fetched: FetchedPage = {
    url: "http://example.test/", // http → TLS probe skipped, headers still analyzed
    finalUrl: "http://example.test/",
    statusCode: 200,
    html: "<!doctype html><html></html>",
    headers,
    screenshotPath: "",
    consoleErrors: [],
    loadTimeMs: 100,
    redirectChain: [],
  };
  return {
    jobId: "job1",
    websiteId: "site1",
    pages: [{ pageId: "p1", crawled: { fetched, extracted: healthyPage(), slug: "home" } }],
    hooks: { appendLog: () => undefined, setStage: () => undefined, bumpStats: () => undefined, markStageFailed: () => undefined },
  };
}

describe("security analyzer", () => {
  it("fails the header checks when security headers are absent", async () => {
    const checks = await runSecurity(ctxWithHeaders({}));
    const byId = new Map(checks.map((c) => [c.rule.id, c.result.status]));
    expect(byId.get("sec-csp")).toBe("fail");
    expect(byId.get("sec-hsts")).toBe("fail");
    expect(byId.get("sec-xcto")).toBe("fail");
    expect(byId.get("sec-xfo")).toBe("fail");
  });

  it("passes when the headers are present", async () => {
    const checks = await runSecurity(
      ctxWithHeaders({
        "content-security-policy": "default-src 'self'",
        "strict-transport-security": "max-age=31536000",
        "x-content-type-options": "nosniff",
        "x-frame-options": "SAMEORIGIN",
        "referrer-policy": "strict-origin-when-cross-origin",
        "permissions-policy": "camera=()",
      }),
    );
    const byId = new Map(checks.map((c) => [c.rule.id, c.result.status]));
    expect(byId.get("sec-csp")).toBe("pass");
    expect(byId.get("sec-hsts")).toBe("pass");
    expect(byId.get("sec-xcto")).toBe("pass");
    expect(byId.get("sec-xfo")).toBe("pass");
  });

  it("flags version-leaking server headers only", async () => {
    const leaky = await runSecurity(ctxWithHeaders({ server: "nginx/1.18.0" }));
    expect(leaky.find((c) => c.rule.id === "sec-server-leak")?.result.status).toBe("fail");
    const clean = await runSecurity(ctxWithHeaders({ server: "nginx" }));
    expect(clean.find((c) => c.rule.id === "sec-server-leak")?.result.status).toBe("pass");
  });

  it("flags cookies missing protective flags", async () => {
    const checks = await runSecurity(ctxWithHeaders({ "set-cookie": "session=abc; Path=/" }));
    const cookie = checks.find((c) => c.rule.id === "sec-cookie-flags");
    expect(cookie?.result.status).toBe("fail");
    expect(String(cookie?.result.evidence)).toContain("Secure");
  });

  it("every failed check carries issue copy (1:1 invariant feed)", async () => {
    const checks = await runSecurity(ctxWithHeaders({}));
    for (const c of checks.filter((c) => c.result.status === "fail")) {
      expect(c.rule.failSeverity).toMatch(/critical|high|medium|low/);
      expect(typeof c.rule.issue.title === "string" ? c.rule.issue.title : "fn").toBeTruthy();
    }
  });
});
