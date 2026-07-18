CREATE TABLE `ai_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text,
	`website_id` text NOT NULL,
	`page_id` text,
	`kind` text NOT NULL,
	`model` text NOT NULL,
	`prompt_file` text NOT NULL,
	`response_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `analysis_jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`website_id`) REFERENCES `websites`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ai_job_idx` ON `ai_responses` (`job_id`);--> statement-breakpoint
CREATE INDEX `ai_website_idx` ON `ai_responses` (`website_id`);--> statement-breakpoint
CREATE TABLE `analysis_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`website_id` text NOT NULL,
	`url` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`stage` text DEFAULT 'queued' NOT NULL,
	`stage_index` integer DEFAULT 0 NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`logs_json` text DEFAULT '[]' NOT NULL,
	`stats_json` text DEFAULT '{"pagesFound":0,"screenshots":0,"checksRun":0,"aiReviews":0}' NOT NULL,
	`error` text,
	`started_at` integer,
	`finished_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`website_id`) REFERENCES `websites`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `jobs_website_idx` ON `analysis_jobs` (`website_id`);--> statement-breakpoint
CREATE TABLE `check_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`check_class` text NOT NULL,
	`fail_severity` text NOT NULL,
	`data_source` text DEFAULT 'crawler' NOT NULL,
	`implemented` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `check_results` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`website_id` text NOT NULL,
	`check_id` text NOT NULL,
	`page_id` text,
	`status` text NOT NULL,
	`details_json` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `analysis_jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`website_id`) REFERENCES `websites`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`check_id`) REFERENCES `check_definitions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `results_job_idx` ON `check_results` (`job_id`);--> statement-breakpoint
CREATE INDEX `results_check_idx` ON `check_results` (`check_id`);--> statement-breakpoint
CREATE TABLE `crawl_artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`page_id` text NOT NULL,
	`job_id` text NOT NULL,
	`type` text NOT NULL,
	`file_path` text,
	`data_json` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `analysis_jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `artifacts_page_idx` ON `crawl_artifacts` (`page_id`);--> statement-breakpoint
CREATE INDEX `artifacts_job_idx` ON `crawl_artifacts` (`job_id`);--> statement-breakpoint
CREATE TABLE `issues` (
	`id` text PRIMARY KEY NOT NULL,
	`check_result_id` text NOT NULL,
	`website_id` text NOT NULL,
	`job_id` text NOT NULL,
	`page_id` text,
	`source_check_id` text NOT NULL,
	`category` text NOT NULL,
	`severity` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`business_impact` text,
	`fix` text,
	`code` text,
	`effort` text,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL,
	`resolved_at` integer,
	FOREIGN KEY (`check_result_id`) REFERENCES `check_results`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`website_id`) REFERENCES `websites`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `analysis_jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `issues_check_result_unique` ON `issues` (`check_result_id`);--> statement-breakpoint
CREATE INDEX `issues_job_idx` ON `issues` (`job_id`);--> statement-breakpoint
CREATE INDEX `issues_website_idx` ON `issues` (`website_id`);--> statement-breakpoint
CREATE TABLE `pages` (
	`id` text PRIMARY KEY NOT NULL,
	`website_id` text NOT NULL,
	`job_id` text NOT NULL,
	`url` text NOT NULL,
	`path` text NOT NULL,
	`title` text,
	`status_code` integer,
	`screenshot_path` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`website_id`) REFERENCES `websites`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `analysis_jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `pages_job_idx` ON `pages` (`job_id`);--> statement-breakpoint
CREATE TABLE `scores` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`website_id` text NOT NULL,
	`category` text NOT NULL,
	`score` real NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `analysis_jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`website_id`) REFERENCES `websites`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scores_job_category_unique` ON `scores` (`job_id`,`category`);--> statement-breakpoint
CREATE INDEX `scores_website_idx` ON `scores` (`website_id`);--> statement-breakpoint
CREATE TABLE `websites` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`domain` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_scan_at` integer
);
