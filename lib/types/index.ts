import { z } from "zod";

/** Issue severity assigned by the prioritizer to FAILED checks. */
export const issueSeveritySchema = z.enum(["critical", "high", "medium", "low"]);
export type IssueSeverity = z.infer<typeof issueSeveritySchema>;

/** Check class severity shown for passing rows in the registry. */
export const checkClassSchema = z.enum(["critical", "warning", "opportunity", "notice"]);
export type CheckClass = z.infer<typeof checkClassSchema>;

export const checkStatusSchema = z.enum(["pass", "fail", "warning", "not-evaluated", "error"]);
export type CheckStatus = z.infer<typeof checkStatusSchema>;

export const issueStatusSchema = z.enum(["open", "resolved"]);
export type IssueStatus = z.infer<typeof issueStatusSchema>;

export const jobStatusSchema = z.enum(["queued", "running", "completed", "failed", "partial"]);
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const scoreCategorySchema = z.enum([
  "seo",
  "accessibility",
  "performance",
  "ux",
  "conversion",
  "best-practices",
]);
export type ScoreCategory = z.infer<typeof scoreCategorySchema>;

export const websiteSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  domain: z.string(),
  name: z.string(),
  createdAt: z.number(),
  lastScanAt: z.number().nullable(),
});
export type Website = z.infer<typeof websiteSchema>;

export const pageSchema = z.object({
  id: z.string(),
  websiteId: z.string(),
  jobId: z.string(),
  url: z.string().url(),
  path: z.string(),
  title: z.string().nullable(),
  statusCode: z.number().nullable(),
  screenshotPath: z.string().nullable(),
  createdAt: z.number(),
});
export type Page = z.infer<typeof pageSchema>;

export const crawlArtifactTypeSchema = z.enum([
  "screenshot",
  "html",
  "headers",
  "extracted",
  "lighthouse",
  "axe",
  "console-errors",
  "tls",
]);
export type CrawlArtifactType = z.infer<typeof crawlArtifactTypeSchema>;

export const crawlArtifactSchema = z.object({
  id: z.string(),
  pageId: z.string(),
  jobId: z.string(),
  type: crawlArtifactTypeSchema,
  /** File path on disk for binary artifacts (screenshot/html). */
  filePath: z.string().nullable(),
  /** Inline JSON payload for structured artifacts (headers/extracted/...). */
  data: z.unknown().nullable(),
  createdAt: z.number(),
});
export type CrawlArtifact = z.infer<typeof crawlArtifactSchema>;

export const checkDefinitionSchema = z.object({
  /** Stable check id, e.g. "seo-title-exists". */
  id: z.string(),
  category: z.string(),
  name: z.string(),
  description: z.string(),
  checkClass: checkClassSchema,
  /** Issue severity used when this check fails. */
  failSeverity: issueSeveritySchema,
  dataSource: z.string(),
  implemented: z.boolean(),
});
export type CheckDefinition = z.infer<typeof checkDefinitionSchema>;

export const checkResultSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  websiteId: z.string(),
  checkId: z.string(),
  pageId: z.string().nullable(),
  status: checkStatusSchema,
  /** What we actually found (evidence), free-form JSON. */
  details: z.unknown().nullable(),
  createdAt: z.number(),
});
export type CheckResult = z.infer<typeof checkResultSchema>;

export const issueSchema = z.object({
  id: z.string(),
  /** 1:1 — every failed CheckResult creates exactly one Issue. */
  checkResultId: z.string(),
  websiteId: z.string(),
  jobId: z.string(),
  pageId: z.string().nullable(),
  sourceCheckId: z.string(),
  category: z.string(),
  severity: issueSeveritySchema,
  title: z.string(),
  description: z.string(),
  businessImpact: z.string().nullable(),
  fix: z.string().nullable(),
  code: z.string().nullable(),
  effort: z.enum(["low", "medium", "high"]).nullable(),
  status: issueStatusSchema,
  createdAt: z.number(),
  resolvedAt: z.number().nullable(),
});
export type Issue = z.infer<typeof issueSchema>;

export const scoreSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  websiteId: z.string(),
  /** One of the 6 categories, or "health" for the overall score. */
  category: z.string(),
  score: z.number().min(0).max(100),
  createdAt: z.number(),
});
export type Score = z.infer<typeof scoreSchema>;

export const jobLogLineSchema = z.object({
  ts: z.number(),
  level: z.enum(["info", "warn", "error"]),
  message: z.string(),
});
export type JobLogLine = z.infer<typeof jobLogLineSchema>;

export const jobStatsSchema = z.object({
  pagesFound: z.number().default(0),
  screenshots: z.number().default(0),
  checksRun: z.number().default(0),
  aiReviews: z.number().default(0),
  /** Stage ids that did not run properly (shown honestly in the dashboard). */
  failedStages: z.array(z.string()).default([]),
});
export type JobStats = z.infer<typeof jobStatsSchema>;

export const analysisJobSchema = z.object({
  id: z.string(),
  websiteId: z.string(),
  url: z.string().url(),
  status: jobStatusSchema,
  stage: z.string(),
  stageIndex: z.number(),
  progress: z.number().min(0).max(100),
  logs: z.array(jobLogLineSchema),
  stats: jobStatsSchema,
  error: z.string().nullable(),
  startedAt: z.number().nullable(),
  finishedAt: z.number().nullable(),
  createdAt: z.number(),
});
export type AnalysisJob = z.infer<typeof analysisJobSchema>;

export const aiResponseKindSchema = z.enum([
  "vision",
  "html-review",
  "cross-page",
  "fix",
  "chat",
]);
export type AIResponseKind = z.infer<typeof aiResponseKindSchema>;

export const aiResponseSchema = z.object({
  id: z.string(),
  jobId: z.string().nullable(),
  websiteId: z.string(),
  pageId: z.string().nullable(),
  kind: aiResponseKindSchema,
  model: z.string(),
  promptFile: z.string(),
  response: z.unknown(),
  createdAt: z.number(),
});
export type AIResponse = z.infer<typeof aiResponseSchema>;
