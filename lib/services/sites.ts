import { desc, eq, and, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export type SiteSummary = {
  id: string;
  domain: string;
  name: string;
  url: string;
  lastScanAt: number | null;
  latestJobId: string | null;
  health: number | null;
  pages: number;
  issues: number;
  critical: number;
};

/** Latest completed/partial job for a website, or null. */
export function latestJobForSite(websiteId: string) {
  const db = getDb();
  const jobs = db
    .select()
    .from(schema.analysisJobs)
    .where(
      and(
        eq(schema.analysisJobs.websiteId, websiteId),
        sql`${schema.analysisJobs.status} IN ('completed','partial')`,
      ),
    )
    .orderBy(desc(schema.analysisJobs.createdAt))
    .limit(1)
    .all();
  return jobs[0] ?? null;
}

export function listSites(): SiteSummary[] {
  const db = getDb();
  const sites = db
    .select()
    .from(schema.websites)
    .orderBy(desc(schema.websites.lastScanAt))
    .all();

  return sites.map((w) => {
    const job = latestJobForSite(w.id);
    if (!job) {
      return {
        id: w.id,
        domain: w.domain,
        name: w.name,
        url: w.url,
        lastScanAt: w.lastScanAt,
        latestJobId: null,
        health: null,
        pages: 0,
        issues: 0,
        critical: 0,
      };
    }
    const health = db
      .select()
      .from(schema.scores)
      .where(and(eq(schema.scores.jobId, job.id), eq(schema.scores.category, "health")))
      .all()[0];
    const pageCount = db
      .select({ n: sql<number>`count(*)` })
      .from(schema.pages)
      .where(eq(schema.pages.jobId, job.id))
      .all()[0];
    const issueRows = db
      .select({ severity: schema.issues.severity, n: sql<number>`count(*)` })
      .from(schema.issues)
      .where(eq(schema.issues.jobId, job.id))
      .groupBy(schema.issues.severity)
      .all();
    const issues = issueRows.reduce((a, r) => a + r.n, 0);
    const critical = issueRows.find((r) => r.severity === "critical")?.n ?? 0;
    return {
      id: w.id,
      domain: w.domain,
      name: w.name,
      url: w.url,
      lastScanAt: w.lastScanAt,
      latestJobId: job.id,
      health: health ? Math.round(health.score) : null,
      pages: pageCount?.n ?? 0,
      issues,
      critical,
    };
  });
}
