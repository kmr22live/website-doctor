import { config } from "@/lib/config";
import { logger } from "@/lib/logger";
import { fetchPage, type FetchedPage } from "@/lib/services/fetcher";
import { extractPage } from "@/lib/services/extractor";
import type { ExtractedPage } from "@/lib/types/extracted";

export type CrawledPage = {
  fetched: FetchedPage;
  extracted: ExtractedPage;
  slug: string;
};

export type CrawlEvents = {
  onPageStart?: (url: string, index: number) => void;
  onPageDone?: (page: CrawledPage, index: number) => void;
  onPageError?: (url: string, error: string) => void;
  onDiscovered?: (total: number, skippedExternal: number) => void;
};

function normalizeUrl(raw: string, base: string): string | null {
  try {
    const u = new URL(raw, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    // Trailing-slash normalization (keep root "/")
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.replace(/\/+$/, "");
    }
    return u.toString();
  } catch {
    return null;
  }
}

function slugFor(url: string, index: number): string {
  try {
    const p = new URL(url).pathname.replace(/\/+$/, "");
    const s = (p === "" ? "home" : p.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "")) || "home";
    return `${String(index).padStart(2, "0")}-${s.slice(0, 60)}`;
  } catch {
    return `${String(index).padStart(2, "0")}-page`;
  }
}

const SKIP_EXTENSIONS = /\.(pdf|jpe?g|png|gif|webp|avif|svg|ico|css|js|json|xml|zip|mp4|webm|mp3|woff2?|ttf|eot|docx?|xlsx?)($|\?)/i;

/**
 * REAL same-origin crawler: entry page first, then discovered internal links,
 * deduped, capped at config.crawl.maxPages. A failing page never aborts the
 * crawl — it reports the error and moves on.
 */
export async function crawlSite(entryUrl: string, jobId: string, events: CrawlEvents = {}): Promise<CrawledPage[]> {
  const results: CrawledPage[] = [];
  const entry = normalizeUrl(entryUrl, entryUrl);
  if (!entry) return results;

  const origin = new URL(entry).hostname;
  const seen = new Set<string>([entry]);
  const queue: string[] = [entry];
  let skippedExternal = 0;
  let index = 0;

  while (queue.length > 0 && results.length < config.crawl.maxPages) {
    const url = queue.shift() as string;
    events.onPageStart?.(url, index);
    try {
      const fetched = await fetchPage(url, jobId, slugFor(url, index));
      const extracted = extractPage(fetched.html, url, fetched.finalUrl, fetched.statusCode);
      results.push({ fetched, extracted, slug: slugFor(url, index) });
      events.onPageDone?.(results[results.length - 1] as CrawledPage, index);

      // Discover new same-origin links from this page.
      for (const l of extracted.links) {
        const n = normalizeUrl(l.href, fetched.finalUrl);
        if (!n) continue;
        const host = new URL(n).hostname;
        if (host !== origin) {
          skippedExternal++;
          continue;
        }
        if (SKIP_EXTENSIONS.test(n)) continue;
        if (!seen.has(n) && seen.size < config.crawl.maxPages * 4) {
          seen.add(n);
          if (queue.length + results.length < config.crawl.maxPages * 2) queue.push(n);
        }
      }
      events.onDiscovered?.(seen.size, skippedExternal);
    } catch (e) {
      logger.warn({ url, err: String(e) }, "page crawl failed — continuing");
      events.onPageError?.(url, String(e).slice(0, 200));
    }
    index++;
  }

  return results;
}
