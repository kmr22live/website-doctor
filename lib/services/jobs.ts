import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { jobLogLineSchema, jobStatsSchema, type JobLogLine, type JobStats } from "@/lib/types";
import { config } from "@/lib/config";
import { STAGES, stageIndex, type StageId } from "@/lib/services/stages";
import { logger } from "@/lib/logger";
import { z } from "zod";

export function ensureWebsite(url: string): { id: string; domain: string; created: boolean } {
  const db = getDb();
  const u = new URL(url);
  const domain = u.hostname;
  const existing = db.select().from(schema.websites).where(eq(schema.websites.domain, domain)).all()[0];
  if (existing) return { id: existing.id, domain, created: false };
  const id = randomUUID();
  const base = domain.replace(/^www\./, "").split(".")[0] ?? domain;
  db.insert(schema.websites)
    .values({
      id,
      url: u.origin,
      domain,
      name: base.charAt(0).toUpperCase() + base.slice(1),
      createdAt: Date.now(),
      lastScanAt: null,
    })
    .run();
  return { id, domain, created: true };
}

export function createJob(websiteId: string, url: string): string {
  const db = getDb();
  const id = randomUUID();
  db.insert(schema.analysisJobs)
    .values({
      id,
      websiteId,
      url,
      status: "queued",
      stage: "queued",
      stageIndex: 0,
      progress: 0,
      logsJson: "[]",
      statsJson: JSON.stringify({ pagesFound: 0, screenshots: 0, checksRun: 0, aiReviews: 0 }),
      createdAt: Date.now(),
    })
    .run();
  return id;
}

export type JobView = {
  id: string;
  websiteId: string;
  url: string;
  status: string;
  stage: string;
  stageIndex: number;
  progress: number;
  logs: JobLogLine[];
  stats: JobStats;
  error: string | null;
  startedAt: number | null;
  finishedAt: number | null;
};

/** A "running" job with no heartbeat for this long is declared failed (zombie process). */
const STUCK_JOB_MS = 15 * 60 * 1000;

function sweepIfStuck(row: typeof schema.analysisJobs.$inferSelect): typeof schema.analysisJobs.$inferSelect {
  if (row.status !== "running" && row.status !== "queued") return row;
  const logs = parseLogs(row.logsJson);
  const lastBeat = logs.length > 0 ? Math.max(...logs.map((l) => l.ts)) : (row.startedAt ?? row.createdAt);
  if (Date.now() - lastBeat > STUCK_JOB_MS) {
    getDb()
      .update(schema.analysisJobs)
      .set({ status: "failed", error: "Job stalled — no progress for 15 minutes (process likely died). Re-run the scan.", finishedAt: Date.now() })
      .where(eq(schema.analysisJobs.id, row.id))
      .run();
    return { ...row, status: "failed", error: "Job stalled — no progress for 15 minutes (process likely died). Re-run the scan." };
  }
  return row;
}

export function getJob(jobId: string): JobView | null {
  const db = getDb();
  let row = db.select().from(schema.analysisJobs).where(eq(schema.analysisJobs.id, jobId)).all()[0];
  if (!row) return null;
  row = sweepIfStuck(row);
  return {
    id: row.id,
    websiteId: row.websiteId,
    url: row.url,
    status: row.status,
    stage: row.stage,
    stageIndex: row.stageIndex,
    progress: row.progress,
    logs: parseLogs(row.logsJson),
    stats: parseStats(row.statsJson),
    error: row.error,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
  };
}

function parseLogs(json: string): JobLogLine[] {
  try {
    return z.array(jobLogLineSchema).parse(JSON.parse(json));
  } catch {
    return [];
  }
}

function parseStats(json: string): JobStats {
  try {
    return jobStatsSchema.parse(JSON.parse(json));
  } catch {
    return { pagesFound: 0, screenshots: 0, checksRun: 0, aiReviews: 0, failedStages: [] };
  }
}

/** Records a stage that did not run properly — surfaced honestly in the UI. */
export function markStageFailed(jobId: string, stage: string): void {
  const db = getDb();
  const row = db.select().from(schema.analysisJobs).where(eq(schema.analysisJobs.id, jobId)).all()[0];
  if (!row) return;
  const stats = parseStats(row.statsJson);
  if (!stats.failedStages.includes(stage)) stats.failedStages.push(stage);
  db.update(schema.analysisJobs)
    .set({ statsJson: JSON.stringify(stats) })
    .where(eq(schema.analysisJobs.id, jobId))
    .run();
}

export function markJobRunning(jobId: string): void {
  getDb()
    .update(schema.analysisJobs)
    .set({ status: "running", startedAt: Date.now() })
    .where(eq(schema.analysisJobs.id, jobId))
    .run();
}

export function setStage(jobId: string, stage: StageId): void {
  const idx = stageIndex(stage);
  const progress = Math.round((idx / STAGES.length) * 100);
  getDb()
    .update(schema.analysisJobs)
    .set({ stage, stageIndex: idx, progress })
    .where(eq(schema.analysisJobs.id, jobId))
    .run();
}

export function appendLog(jobId: string, message: string, level: "info" | "warn" | "error" = "info"): void {
  const db = getDb();
  const row = db.select().from(schema.analysisJobs).where(eq(schema.analysisJobs.id, jobId)).all()[0];
  if (!row) return;
  const logs = parseLogs(row.logsJson);
  logs.push({ ts: Date.now(), level, message: message.slice(0, 500) });
  const trimmed = logs.slice(-config.limits.maxLogLines);
  db.update(schema.analysisJobs)
    .set({ logsJson: JSON.stringify(trimmed) })
    .where(eq(schema.analysisJobs.id, jobId))
    .run();
  logger.info({ jobId, message }, "job");
}

export function bumpStats(jobId: string, delta: Partial<Omit<JobStats, "failedStages">>): void {
  const db = getDb();
  const row = db.select().from(schema.analysisJobs).where(eq(schema.analysisJobs.id, jobId)).all()[0];
  if (!row) return;
  const stats = parseStats(row.statsJson);
  for (const k of Object.keys(delta) as (keyof Omit<JobStats, "failedStages">)[]) {
    stats[k] = (stats[k] ?? 0) + (delta[k] ?? 0);
  }
  db.update(schema.analysisJobs)
    .set({ statsJson: JSON.stringify(stats) })
    .where(eq(schema.analysisJobs.id, jobId))
    .run();
}

export function finishJob(jobId: string, status: "completed" | "failed" | "partial", error?: string): void {
  getDb()
    .update(schema.analysisJobs)
    .set({ status, progress: status === "failed" ? undefined : 100, error: error ?? null, finishedAt: Date.now() })
    .where(eq(schema.analysisJobs.id, jobId))
    .run();
}
