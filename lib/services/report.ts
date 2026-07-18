import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { latestJobForSite } from "@/lib/services/sites";
import { listRules } from "@/lib/rules/engine";
import { config } from "@/lib/config";

export type ReportIssue = {
  id: string;
  severity: string;
  category: string;
  title: string;
  description: string;
  businessImpact: string | null;
  fix: string | null;
  code: string | null;
  effort: string | null;
  sourceCheckId: string;
  status: string;
  pagePath: string | null;
  createdAt: number;
  /** Actual offending page elements: selector + real HTML snippet. */
  affected: { selector: string | null; html: string }[];
};

export type ReportCheckResult = {
  checkId: string;
  name: string;
  category: string;
  checkClass: string;
  status: string;
  issueId: string | null;
  issueSeverity: string | null;
  dataSource: string;
  pagePath: string | null;
  implemented: boolean;
  /** What the scanner recorded — shown for error rows ("did not run properly"). */
  evidence: string | null;
};

export type ReportPage = {
  id: string;
  url: string;
  path: string;
  title: string | null;
  statusCode: number | null;
  screenshotPath: string | null;
  issueCount: number;
  scores: Record<string, number>;
  metrics: Record<string, string>;
};

export type SiteReport = {
  site: { id: string; domain: string; name: string; url: string; lastScanAt: number | null };
  job: {
    id: string;
    status: string;
    stage: string;
    progress: number;
    startedAt: number | null;
    finishedAt: number | null;
    failedStages: string[];
  } | null;
  scores: Record<string, number>;
  issues: ReportIssue[];
  checks: ReportCheckResult[];
  pages: ReportPage[];
  aiSummary: string | null;
};

export function getSiteReport(siteId: string): SiteReport | null {
  const db = getDb();
  const site = db.select().from(schema.websites).where(eq(schema.websites.id, siteId)).all()[0];
  if (!site) return null;
  const job = latestJobForSite(site.id);
  return buildReport(site, job);
}

/** Report for one specific job (used by the PDF export). */
export function getJobReport(jobId: string): SiteReport | null {
  const db = getDb();
  const job = db.select().from(schema.analysisJobs).where(eq(schema.analysisJobs.id, jobId)).all()[0];
  if (!job) return null;
  const site = db.select().from(schema.websites).where(eq(schema.websites.id, job.websiteId)).all()[0];
  if (!site) return null;
  return buildReport(site, job);
}

function buildReport(
  site: typeof schema.websites.$inferSelect,
  job: typeof schema.analysisJobs.$inferSelect | null,
): SiteReport {
  const db = getDb();
  const base: SiteReport = {
    site: { id: site.id, domain: site.domain, name: site.name, url: site.url, lastScanAt: site.lastScanAt },
    job: null,
    scores: {},
    issues: [],
    checks: [],
    pages: [],
    aiSummary: null,
  };
  if (!job) return base;

  let failedStages: string[] = [];
  try {
    const stats = JSON.parse(job.statsJson) as { failedStages?: string[] };
    failedStages = stats.failedStages ?? [];
  } catch {
    // legacy stats without failedStages
  }
  base.job = {
    id: job.id,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    failedStages,
  };

  for (const s of db.select().from(schema.scores).where(eq(schema.scores.jobId, job.id)).all()) {
    base.scores[s.category] = Math.round(s.score);
  }

  const pageRows = db
    .select()
    .from(schema.pages)
    .where(eq(schema.pages.jobId, job.id))
    .orderBy(asc(schema.pages.createdAt))
    .all();
  const pagePathById = new Map(pageRows.map((p) => [p.id, p.path]));

  const issueRows = db
    .select()
    .from(schema.issues)
    .where(eq(schema.issues.jobId, job.id))
    .all();
  base.issues = issueRows.map((i) => {
    let affected: ReportIssue["affected"] = [];
    if (i.affectedJson) {
      try {
        affected = JSON.parse(i.affectedJson) as ReportIssue["affected"];
      } catch {
        // malformed — leave empty
      }
    }
    return {
      id: i.id,
      severity: i.severity,
      category: i.category,
      title: i.title,
      description: i.description,
      businessImpact: i.businessImpact,
      fix: i.fix,
      code: i.code,
      effort: i.effort,
      sourceCheckId: i.sourceCheckId,
      status: i.status,
      pagePath: i.pageId ? (pagePathById.get(i.pageId) ?? null) : "Site-wide",
      createdAt: i.createdAt,
      affected,
    };
  });

  const issueByResult = new Map(issueRows.map((i) => [i.checkResultId, i]));
  const defs = db.select().from(schema.checkDefinitions).all();
  const defById = new Map(defs.map((d) => [d.id, d]));
  const resultRows = db
    .select()
    .from(schema.checkResults)
    .where(eq(schema.checkResults.jobId, job.id))
    .all();
  // One row per persisted result (so registry failed-count == issue count)…
  base.checks = resultRows.map((r) => {
    const def = defById.get(r.checkId);
    const issue = issueByResult.get(r.id);
    let evidence: string | null = null;
    if (r.detailsJson) {
      try {
        evidence = (JSON.parse(r.detailsJson) as { evidence?: string | null }).evidence ?? null;
      } catch {
        // malformed details
      }
    }
    return {
      checkId: r.checkId,
      name: def?.name ?? r.checkId,
      category: def?.category ?? "Uncategorized",
      checkClass: def?.checkClass ?? "notice",
      status: r.status,
      issueId: issue?.id ?? null,
      issueSeverity: issue?.severity ?? null,
      dataSource: def?.dataSource ?? "crawler",
      pagePath: r.pageId ? (pagePathById.get(r.pageId) ?? null) : null,
      implemented: def?.implemented ?? true,
      evidence,
    };
  });
  // …plus one N/A row per catalog definition that produced no result this scan.
  const resultCheckIds = new Set(resultRows.map((r) => r.checkId));
  for (const def of defs) {
    if (resultCheckIds.has(def.id)) continue;
    base.checks.push({
      checkId: def.id,
      name: def.name,
      category: def.category,
      checkClass: def.checkClass,
      status: "not-evaluated",
      issueId: null,
      issueSeverity: null,
      dataSource: def.dataSource,
      pagePath: null,
      implemented: def.implemented,
      evidence: null,
    });
  }

  const issueCountByPage = new Map<string, number>();
  for (const i of issueRows) {
    if (i.pageId) issueCountByPage.set(i.pageId, (issueCountByPage.get(i.pageId) ?? 0) + 1);
  }

  // Per-page mini scores: severity-weighted deductions from that page's failed checks.
  const ruleMeta = new Map(listRules().map((r) => [r.id, r]));
  const pageScores = new Map<string, Record<string, number>>();
  for (const r of resultRows) {
    if (r.status !== "fail" || !r.pageId) continue;
    const rule = ruleMeta.get(r.checkId);
    if (!rule) continue;
    const s = pageScores.get(r.pageId) ?? { seo: 100, accessibility: 100, performance: 100, ux: 100, conversion: 100, "best-practices": 100 };
    const deduction = config.scoring.deductions[rule.failSeverity] ?? 5;
    s[rule.scoreCategory] = Math.max(0, (s[rule.scoreCategory] ?? 100) - deduction);
    pageScores.set(r.pageId, s);
  }

  // LCP/CLS metrics come from the Lighthouse artifact once Phase 3 lands.
  const metricsByPage = new Map<string, Record<string, string>>();
  const lighthouseArtifacts = db
    .select()
    .from(schema.crawlArtifacts)
    .where(and(eq(schema.crawlArtifacts.jobId, job.id), eq(schema.crawlArtifacts.type, "lighthouse")))
    .all();
  for (const a of lighthouseArtifacts) {
    if (!a.dataJson) continue;
    try {
      const d = JSON.parse(a.dataJson) as { metrics?: Record<string, string> };
      if (d.metrics) metricsByPage.set(a.pageId, d.metrics);
    } catch {
      // ignore malformed artifact
    }
  }

  base.pages = pageRows.map((p) => ({
    id: p.id,
    url: p.url,
    path: p.path,
    title: p.title,
    statusCode: p.statusCode,
    screenshotPath: p.screenshotPath,
    issueCount: issueCountByPage.get(p.id) ?? 0,
    scores: pageScores.get(p.id) ?? { seo: 100, accessibility: 100, performance: 100 },
    metrics: metricsByPage.get(p.id) ?? {},
  }));

  const summary = db
    .select()
    .from(schema.aiResponses)
    .where(and(eq(schema.aiResponses.jobId, job.id), eq(schema.aiResponses.kind, "cross-page")))
    .all()[0];
  if (summary) {
    try {
      const parsed: unknown = JSON.parse(summary.responseJson);
      if (parsed && typeof parsed === "object" && "summary" in parsed && typeof parsed.summary === "string") {
        base.aiSummary = parsed.summary;
      }
    } catch {
      // ignore malformed stored JSON
    }
  }

  return base;
}
