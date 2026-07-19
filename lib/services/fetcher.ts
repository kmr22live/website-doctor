import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser } from "playwright";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";

export type FetchedPage = {
  url: string;
  finalUrl: string;
  statusCode: number | null;
  html: string;
  headers: Record<string, string>;
  screenshotPath: string;
  consoleErrors: string[];
  loadTimeMs: number;
  redirectChain: string[];
};

// Browser singleton survives hot reloads.
const globalForBrowser = globalThis as unknown as { __wdBrowser?: Browser };

export async function getBrowser(): Promise<Browser> {
  if (globalForBrowser.__wdBrowser?.isConnected()) return globalForBrowser.__wdBrowser;
  const browser = await chromium.launch({
    headless: true,
    // Container-friendly: small /dev/shm and tight RAM on free-tier hosts.
    args: ["--disable-dev-shm-usage", "--disable-gpu", "--no-sandbox", "--disable-extensions"],
  });
  globalForBrowser.__wdBrowser = browser;
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (globalForBrowser.__wdBrowser?.isConnected()) {
    await globalForBrowser.__wdBrowser.close();
  }
  globalForBrowser.__wdBrowser = undefined;
}

/**
 * REAL fetch of one URL with headless Chromium: real navigation, waits for
 * network idle, captures a real screenshot + raw HTML + response headers.
 */
export async function fetchPage(url: string, jobId: string, slug: string): Promise<FetchedPage> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: config.crawl.viewport,
    userAgent: config.crawl.userAgent,
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const redirectChain: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 500));
  });
  page.on("pageerror", (err) => {
    consoleErrors.push(String(err.message ?? err).slice(0, 500));
  });

  const started = Date.now();
  try {
    const response = await page.goto(url, {
      timeout: config.crawl.timeoutMs,
      waitUntil: "domcontentloaded",
    });
    // Prefer network idle but do not fail the fetch if the site never settles.
    await page
      .waitForLoadState("networkidle", { timeout: Math.min(15_000, config.crawl.timeoutMs) })
      .catch(() => undefined);

    // Walk the redirect chain from the final response backwards.
    let req = response?.request();
    while (req) {
      redirectChain.unshift(req.url());
      req = req.redirectedFrom() ?? undefined;
    }

    const html = await page.content();
    const headers: Record<string, string> = {};
    if (response) {
      for (const [k, v] of Object.entries(await response.allHeaders())) headers[k.toLowerCase()] = v;
    }

    const shotDir = path.join(config.artifactsDir, jobId);
    fs.mkdirSync(shotDir, { recursive: true });
    const screenshotPath = path.join(shotDir, `${slug}.png`);
    await page
      .screenshot({ path: screenshotPath, fullPage: false, timeout: 15_000 })
      .catch((e: unknown) => {
        logger.warn({ url, err: String(e) }, "screenshot failed");
      });

    return {
      url,
      finalUrl: page.url(),
      statusCode: response?.status() ?? null,
      html,
      headers,
      screenshotPath: fs.existsSync(screenshotPath) ? screenshotPath : "",
      consoleErrors,
      loadTimeMs: Date.now() - started,
      redirectChain,
    };
  } finally {
    await context.close().catch(() => undefined);
  }
}

/** Plain HTTP status probe (for broken-link checks) — no browser needed. */
export async function probeStatus(url: string, timeoutMs = 10_000): Promise<number | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    let res = await fetch(url, { method: "HEAD", redirect: "follow", signal: ctrl.signal });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: "GET", redirect: "follow", signal: ctrl.signal });
    }
    clearTimeout(t);
    return res.status;
  } catch {
    return null;
  }
}
