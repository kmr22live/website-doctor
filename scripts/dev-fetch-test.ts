import { fetchPage, closeBrowser } from "../lib/services/fetcher";
import { extractPage } from "../lib/services/extractor";

async function main() {
  const f = await fetchPage("https://example.com", "test-job", "home");
  const x = extractPage(f.html, f.url, f.finalUrl, f.statusCode);
  console.log(
    JSON.stringify({
      status: f.statusCode,
      finalUrl: f.finalUrl,
      htmlLen: f.html.length,
      screenshot: f.screenshotPath,
      headerCount: Object.keys(f.headers).length,
      title: x.title,
      h1: x.headings.filter((h) => h.level === 1).length,
      links: x.links.length,
      viewport: x.viewport,
      hasDoctype: x.hasDoctype,
      words: x.wordCount,
    }),
  );
  await closeBrowser();
}

main().catch((e: unknown) => {
  console.error("FAIL", e);
  process.exit(1);
});
