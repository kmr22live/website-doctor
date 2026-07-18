# PROGRESS.md — build checklist (Claude Code: work top-down, check items off, commit)

Rules: do the next unchecked `[ ]` item. After each, run `bash scripts/validate.sh`,
fix any failure, mark `[x]`, add discovered subtasks, and commit. When ALL items are
`[x]` and validate + smoke pass, write `ALL DONE` to `STATUS.txt` and stop.

## Phase 0 — Foundation
- [x] Scaffold Next.js (App Router) + TypeScript strict + Tailwind + shadcn/ui
- [x] Tailwind theme tokens from prototype (bg/panel/accent/severity/fonts)
- [x] Drizzle + SQLite setup + first migration
- [x] zod schemas + inferred types: Website, Page, CrawlArtifact, CheckDefinition, CheckResult, Issue, Score, AnalysisJob, AIResponse
- [x] Dashboard shell (sidebar + views routing) matching prototype layout
- [x] `scripts/validate.sh` green; app boots (`pnpm dev` serves the shell)

## Phase 1 — REAL single-URL vertical slice
- [x] Playwright service: real fetch of one URL (nav + network-idle) → screenshot + HTML + headers
- [x] Cheerio extraction service (title/meta/canonical/robots/H1-H6/img+alt/forms/buttons/links/schema/OG/Twitter/favicon/viewport)
- [x] Rule-engine core: glob-discovered plugins, RuleResult contract, evaluate(ctx)
- [x] Implement Phase-1 real rules (see SPEC "Phase-1 real rules") — 27 rules shipped
- [x] Issue builder enforcing 1:1 failed-check→issue invariant + severity (unique index on check_result_id)
- [x] Real scoring for the slice (6 categories + health)
- [x] `POST /api/analyze` runs the real slice and persists a report
- [x] Dashboard renders REAL result: health ring, donut, score cards, top issues
- [x] Issues table + right drawer (found / impact / fix + code / mark resolved)
- [x] `scripts/smoke.sh` scans a live URL end-to-end and asserts real findings — GREEN

## Phase 2 — Crawl + live progress
- [x] Crawler: same-origin, dedupe, ≤10 pages, per-page artifacts (verified: 10 pages on books.toscrape.com, 231 checks, 91 issues 1:1)
- [x] In-process job queue; independent stages; partial-on-failure, never abort
- [x] Analyzing view: real SSE progress, 15-stage timeline, live stat cards, live log (SSE primary + polling fallback)
- [x] Pages view: real screenshot thumbnails + per-page mini scores; click filters issues

## Phase 3 — Deep analyzers
- [x] Lighthouse per page (store raw JSON; LCP/CLS/INP/FCP/TBT) — capped by LIGHTHOUSE_MAX_PAGES (default 5)
- [x] axe-core per page → checks → issues (impact→severity mapping; needed serverExternalPackages for axe-core)
- [x] Security headers + TLS probe; console errors; broken links (4xx); redirects; mixed content
- [x] Contrast (wcag-contrast) + focus visibility — covered by axe-core's real color-contrast + focus rules; wcag-contrast lib installed for Phase-5 custom checks

## Phase 4 — Real AI
- [x] AIProvider interface + **Gemini impl first** (user override; config-driven model, JSON response-schema mode); zod-validated JSON
- [x] Prompt files: vision.md, html-review.md, cross-page.md, fix-generator.md, chat.md
- [x] Vision review (real screenshot) + HTML review (real data)
- [x] Cross-page consistency + fix generator (explanation/impact/fix+code)
- [x] `POST /api/chat` answers only from stored analysis; refuses out-of-scope (refused flag in schema)
- [x] GEMINI_API_KEY resolved (2026-07-17): key now valid; full AI pipeline verified live on books.toscrape.com — 11 vision + 12 html + 2 cross-page findings, exec summary, 25 AI issues (1:1 held), 5 AI fix cards, chat answers from stored analysis and refuses out-of-scope.

## Phase 5 — Breadth, scores, report, polish
- [x] Port full 331-check catalog from prototype CHECKS as CheckDefinitions (real category+severity; scripts/gen-catalog.mjs; long tail shows N/A never fake pass)
- [x] Check registry view (accordion, filters, status pills, data-source chips, reconciliation banner)
- [x] Configurable scoring engine (weights file: config/scoring-weights.ts) → final 6 scores + health
- [x] PDF report route (Playwright print-to-PDF of /report/:jobId/print — verified real %PDF output)
- [x] Projects multi-site history; empty/loading/error states; responsive 360/768/920/1280 (prototype breakpoint CSS ported)
- [x] Unit tests: rule engine, scoring, one analyzer (17 tests green; test step added to validate.sh)

## Post-launch: honest "not run" states + targeted re-run (2026-07-17)
- [x] New check status `error` ("Not run — error"): crashing rules, failed Lighthouse/axe/AI runs surface as orange registry rows with the crash evidence — never folded into N/A, never fake passes. Errors never create issues or deduct scores.
- [x] `failedStages` tracked per job; Overview shows a partial-results banner naming the stages that did not run properly.
- [x] Targeted re-run: per-check button on every implemented registry row + per-analyzer re-run on the data-source chips. POST /api/jobs/:id/rerun {checkId|stage}. Rules/security/AI re-run offline from stored artifacts; Lighthouse/axe/links revisit live. Old results+issues replaced atomically (1:1 preserved), resolved marks carried over (same check+page), scores recomputed. Verified live: single-check (10 rows, no dupes), stage (security 9 rows), resolvedKept=1, 93 failed == 93 issues.
- [x] Stuck-job watchdog: running job with no log heartbeat for 15 min is marked failed on read.
- [x] PDF header states checks run / N/A / did-not-run counts.

## Affected elements in issues (2026-07-18)
- [x] Issues now carry the REAL offending page elements (selector + actual HTML, cap 5 × 300 chars) in a new issues.affected_json column. Sources: axe node HTML, Lighthouse LCP/CLS node snippets, and 7 rule-engine rules via extractor offender samples (missing alt, bad links, inline handlers, inline styles, deprecated tags, unlabeled inputs, blocking scripts).
- [x] Issue drawer shows an "Affected elements" section with per-element selector + code block + copy-all; AI fix generator receives the snippets so fixes target the real elements.
- [x] Old scans have no snippets (section hides); appears on new scans and targeted re-runs. Verified live: axe re-run on namastedev.com → 35 issues with real element HTML.

## Notes / assumptions (append as you go)
- Project lives at C:/Users/Arjun/website-doctor (copied from handoff; Downloads path had space+parens).
- Stack pinned: Next 16.2.10, React 19.2.4, Tailwind v4 (CSS-first @theme tokens), shadcn v4 (base-ui, style base-nova), Drizzle + better-sqlite3, zod v4.
- AI provider: Gemini first (user override of CLAUDE.md OpenAI default) — GEMINI_API_KEY/AI_MODEL/AI_VISION_MODEL from .env, model gemini-3.5-flash.
- Prototype HTML is a bundled artifact (document embedded as escaped JS string); extracted to design/prototype-source.html (CHECKS catalog + all view markup + demo copy).
- Rule discovery: true runtime fs-glob breaks under Turbopack bundling, so scripts/gen-rules-index.mjs globs lib/rules/defs/*.ts and regenerates index.gen.ts on predev/prebuild/pretypecheck — adding a rule file still needs zero orchestration changes.
- smoke.sh asserts the 1:1 invariant (failed checks == issues, same severities) in addition to real extracted data.
- Phase-1 pipeline walks all 15 canonical stages; not-yet-real stages log "arrives in Phase N — skipped" honestly rather than faking output.
