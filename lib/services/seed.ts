import { getDb, schema } from "@/lib/db";
import { ensureWebsite, createJob, getJob } from "@/lib/services/jobs";
import { startAnalysis } from "@/lib/services/pipeline";
import { logger } from "@/lib/logger";

const DEFAULT_SEED_URLS = "https://example.com";
const POLL_MS = 10_000;
const MAX_WAIT_MS = 15 * 60_000;

/** Parses SEED_URLS: comma list; undefined → defaults; empty string → disabled. */
export function parseSeedUrls(env: string | undefined): string[] {
  const raw = env === undefined ? DEFAULT_SEED_URLS : env;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Boot-time self-seeding: when the database is EMPTY (fresh deploy on an
 * ephemeral disk), the server scans the demo URLs itself — REAL scans through
 * the normal pipeline, never bundled or fabricated data. Runs scans
 * sequentially (small instances can't fit two Playwright pipelines at once).
 * Existing data always wins: any website row present → no-op.
 */
export function seedIfEmpty(): void {
  const urls = parseSeedUrls(process.env.SEED_URLS);
  if (urls.length === 0) {
    logger.info("seed: disabled (SEED_URLS empty)");
    return;
  }

  let count = 0;
  try {
    count = getDb().select().from(schema.websites).all().length;
  } catch (e) {
    logger.warn({ err: String(e) }, "seed: could not read database — skipping");
    return;
  }
  if (count > 0) {
    logger.info({ sites: count }, "seed: skipped (data present)");
    return;
  }

  logger.info({ urls }, "seed: empty database — starting real demo scans");
  void (async () => {
    // Let the server finish booting and pass its health check before the
    // first Chromium spawns — on 512MB instances the overlap causes OOM.
    await sleep(30_000);
    for (const url of urls) {
      try {
        const site = ensureWebsite(url);
        const jobId = createJob(site.id, url);
        startAnalysis(jobId, site.id, url);
        logger.info({ url, jobId }, "seed: scan started");

        const started = Date.now();
        for (;;) {
          await sleep(POLL_MS);
          const job = getJob(jobId);
          const status = job?.status ?? "unknown";
          if (status === "completed" || status === "partial" || status === "failed") {
            logger.info({ url, status }, "seed: scan finished");
            break;
          }
          if (Date.now() - started > MAX_WAIT_MS) {
            logger.warn({ url }, "seed: scan exceeded wait cap — moving on");
            break;
          }
        }
      } catch (e) {
        logger.warn({ url, err: String(e).slice(0, 200) }, "seed: scan failed — continuing with next");
      }
    }
    logger.info("seed: done");
  })();
}
