import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";

/**
 * Drizzle schema — SQLite now, written to port cleanly to Postgres later
 * (text ids, integer ms timestamps, JSON as text columns).
 */

export const websites = sqliteTable("websites", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  domain: text("domain").notNull(),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull(),
  lastScanAt: integer("last_scan_at"),
});

export const analysisJobs = sqliteTable(
  "analysis_jobs",
  {
    id: text("id").primaryKey(),
    websiteId: text("website_id")
      .notNull()
      .references(() => websites.id),
    url: text("url").notNull(),
    status: text("status").notNull().default("queued"),
    stage: text("stage").notNull().default("queued"),
    stageIndex: integer("stage_index").notNull().default(0),
    progress: integer("progress").notNull().default(0),
    logsJson: text("logs_json").notNull().default("[]"),
    statsJson: text("stats_json")
      .notNull()
      .default('{"pagesFound":0,"screenshots":0,"checksRun":0,"aiReviews":0}'),
    error: text("error"),
    startedAt: integer("started_at"),
    finishedAt: integer("finished_at"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("jobs_website_idx").on(t.websiteId)],
);

export const pages = sqliteTable(
  "pages",
  {
    id: text("id").primaryKey(),
    websiteId: text("website_id")
      .notNull()
      .references(() => websites.id),
    jobId: text("job_id")
      .notNull()
      .references(() => analysisJobs.id),
    url: text("url").notNull(),
    path: text("path").notNull(),
    title: text("title"),
    statusCode: integer("status_code"),
    screenshotPath: text("screenshot_path"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("pages_job_idx").on(t.jobId)],
);

export const crawlArtifacts = sqliteTable(
  "crawl_artifacts",
  {
    id: text("id").primaryKey(),
    pageId: text("page_id")
      .notNull()
      .references(() => pages.id),
    jobId: text("job_id")
      .notNull()
      .references(() => analysisJobs.id),
    type: text("type").notNull(),
    filePath: text("file_path"),
    dataJson: text("data_json"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("artifacts_page_idx").on(t.pageId), index("artifacts_job_idx").on(t.jobId)],
);

export const checkDefinitions = sqliteTable("check_definitions", {
  id: text("id").primaryKey(),
  category: text("category").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  checkClass: text("check_class").notNull(),
  failSeverity: text("fail_severity").notNull(),
  dataSource: text("data_source").notNull().default("crawler"),
  implemented: integer("implemented", { mode: "boolean" }).notNull().default(false),
});

export const checkResults = sqliteTable(
  "check_results",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => analysisJobs.id),
    websiteId: text("website_id")
      .notNull()
      .references(() => websites.id),
    checkId: text("check_id")
      .notNull()
      .references(() => checkDefinitions.id),
    pageId: text("page_id").references(() => pages.id),
    status: text("status").notNull(),
    detailsJson: text("details_json"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("results_job_idx").on(t.jobId), index("results_check_idx").on(t.checkId)],
);

export const issues = sqliteTable(
  "issues",
  {
    id: text("id").primaryKey(),
    // 1:1 invariant: a failed CheckResult creates exactly one Issue.
    checkResultId: text("check_result_id")
      .notNull()
      .references(() => checkResults.id),
    websiteId: text("website_id")
      .notNull()
      .references(() => websites.id),
    jobId: text("job_id")
      .notNull()
      .references(() => analysisJobs.id),
    pageId: text("page_id").references(() => pages.id),
    sourceCheckId: text("source_check_id").notNull(),
    category: text("category").notNull(),
    severity: text("severity").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    businessImpact: text("business_impact"),
    fix: text("fix"),
    code: text("code"),
    effort: text("effort"),
    /** JSON array of offending page elements: [{selector, html}] — capped at 5. */
    affectedJson: text("affected_json"),
    status: text("status").notNull().default("open"),
    createdAt: integer("created_at").notNull(),
    resolvedAt: integer("resolved_at"),
  },
  (t) => [
    uniqueIndex("issues_check_result_unique").on(t.checkResultId),
    index("issues_job_idx").on(t.jobId),
    index("issues_website_idx").on(t.websiteId),
  ],
);

export const scores = sqliteTable(
  "scores",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => analysisJobs.id),
    websiteId: text("website_id")
      .notNull()
      .references(() => websites.id),
    category: text("category").notNull(),
    score: real("score").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("scores_job_category_unique").on(t.jobId, t.category),
    index("scores_website_idx").on(t.websiteId),
  ],
);

export const aiResponses = sqliteTable(
  "ai_responses",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id").references(() => analysisJobs.id),
    websiteId: text("website_id")
      .notNull()
      .references(() => websites.id),
    pageId: text("page_id").references(() => pages.id),
    kind: text("kind").notNull(),
    model: text("model").notNull(),
    promptFile: text("prompt_file").notNull(),
    responseJson: text("response_json").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("ai_job_idx").on(t.jobId), index("ai_website_idx").on(t.websiteId)],
);
