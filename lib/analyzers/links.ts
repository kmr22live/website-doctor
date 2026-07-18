import { probeStatus } from "@/lib/services/fetcher";
import { config } from "@/lib/config";
import { analyzerCheck } from "@/lib/analyzers/helpers";
import type { AnalyzerContext } from "@/lib/analyzers/types";
import type { EvaluatedCheck } from "@/lib/rules/engine";

/** REAL broken-link + redirect-chain analysis: probes internal links with HTTP requests. */
export async function runLinkChecks(ctx: AnalyzerContext): Promise<EvaluatedCheck[]> {
  const { jobId, hooks } = ctx;
  const checks: EvaluatedCheck[] = [];

  // Collect unique internal link targets across all crawled pages.
  const targets = new Map<string, { fromPath: string; pageId: string }>();
  const crawledUrls = new Set(ctx.pages.map((p) => p.crawled.fetched.finalUrl.replace(/\/+$/, "")));
  for (const p of ctx.pages) {
    for (const l of p.crawled.extracted.links) {
      if (!l.isInternal) continue;
      try {
        const abs = new URL(l.href, p.crawled.fetched.finalUrl);
        abs.hash = "";
        const key = abs.toString().replace(/\/+$/, "");
        if (crawledUrls.has(key)) continue; // already fetched with a real browser
        if (/\.(jpe?g|png|gif|webp|svg|css|js|woff2?)($|\?)/i.test(key)) continue;
        if (!targets.has(key)) targets.set(key, { fromPath: new URL(p.crawled.fetched.finalUrl).pathname, pageId: p.pageId });
      } catch {
        // malformed href — covered by the nav-bad-links rule
      }
    }
  }

  const probeList = [...targets.entries()].slice(0, config.analyzers.linkProbeMax);
  const broken: { url: string; status: number | null; fromPath: string; pageId: string }[] = [];
  for (const [url, meta] of probeList) {
    const status = await probeStatus(url);
    if (status !== null && status >= 400) broken.push({ url, status, ...meta });
    if (status === null) broken.push({ url, status, ...meta });
  }
  hooks.appendLog(jobId, `probed ${probeList.length} internal link target(s) — ${broken.length} broken`);

  // Group broken links per source page for 1:1 issue creation.
  const bySource = new Map<string, typeof broken>();
  for (const b of broken) bySource.set(b.pageId, [...(bySource.get(b.pageId) ?? []), b]);

  for (const p of ctx.pages) {
    const list = bySource.get(p.pageId) ?? [];
    const anyProbedFromPage = probeList.some(([, m]) => m.pageId === p.pageId);
    if (!anyProbedFromPage) continue;
    checks.push(
      analyzerCheck({
        id: "nav-broken-internal-links",
        name: "Internal links resolve (no 4xx)",
        category: "Navigation",
        checkClass: "critical",
        failSeverity: "high",
        scoreCategory: "seo",
        dataSource: "crawler",
        pageId: p.pageId,
        result:
          list.length > 0
            ? {
                status: "fail",
                evidence: list.slice(0, 5).map((b) => `${b.url} → ${b.status ?? "unreachable"}`).join("; "),
                details: list.length,
              }
            : { status: "pass", evidence: "all probed internal links resolve" },
        issue: {
          title: `${list.length} broken internal link(s)`,
          description: `Links on ${p.crawled.fetched.finalUrl} return errors: ${list.slice(0, 5).map((b) => `${b.url} (${b.status ?? "unreachable"})`).join(", ")}`,
          businessImpact: "Visitors hitting 404s mid-journey rarely retry, and broken links waste crawl budget and erode search trust.",
          fix: "Update the links to the current URLs or add 301 redirects from the old paths.",
          code: "Redirect 301 /old-path /new-path",
          effort: "low",
        },
      }),
    );
  }

  // Redirect chains observed during the crawl.
  for (const p of ctx.pages) {
    const chain = p.crawled.fetched.redirectChain;
    if (chain.length === 0) continue;
    checks.push(
      analyzerCheck({
        id: "nav-redirect-chain",
        name: "No redirect chains (max 1 hop)",
        category: "Navigation",
        checkClass: "warning",
        failSeverity: "low",
        scoreCategory: "seo",
        dataSource: "crawler",
        pageId: p.pageId,
        result:
          chain.length > 2
            ? { status: "fail", evidence: chain.join(" → "), details: chain.length - 1 }
            : { status: "pass", evidence: chain.length === 2 ? `single redirect: ${chain.join(" → ")}` : "no redirects" },
        issue: {
          title: `Redirect chain with ${chain.length - 1} hops`,
          description: `Reaching ${p.crawled.fetched.finalUrl} follows ${chain.length - 1} redirects: ${chain.join(" → ")}`,
          businessImpact: "Each hop adds latency and leaks link equity; long chains can stop crawlers entirely.",
          fix: "Point the original URL directly at the final destination with a single 301.",
          effort: "low",
        },
      }),
    );
  }

  return checks;
}
