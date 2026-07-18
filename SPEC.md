# SPEC.md — Website Doctor (real integration build spec)

Build the real product described in `design/original-handoff.md`, using the UI in
`design/Website-Doctor-prototype.html` as the design contract. This file is the
authoritative build order. **Real data end to end — no mocks in the product path.**

Follow the architecture and rules in `CLAUDE.md`. Work through `PROGRESS.md` top to
bottom. Each phase must leave a runnable, demoable app.

---

## PHASE 0 — Foundation (must end with the app booting and validate.sh green)
- Scaffold a single Next.js (App Router) + TypeScript (strict) app.
- Tailwind + shadcn/ui; implement the prototype's dark theme tokens as Tailwind config.
- Drizzle + SQLite; migrations. Schema (zod + inferred TS in `lib/types`):
  Website, Page, CrawlArtifact, CheckDefinition, CheckResult, Issue (1:1 with a failed
  CheckResult), Score, AnalysisJob (stage/progress/logs), AIResponse.
- `scripts/validate.sh` runs typecheck + lint + build. `scripts/smoke.sh` scaffolded.
- App boots to an empty dashboard shell matching the prototype layout.

## PHASE 1 — REAL single-URL vertical slice (the money phase — make this bulletproof)
This is the minimum REAL product. Prioritise it above breadth.
- `POST /api/analyze { url }` → creates an AnalysisJob, then **actually**:
  - fetches the URL with Playwright (headless Chromium, real navigation, network-idle),
    captures a real screenshot + raw HTML + response headers.
  - extracts with Cheerio: title, meta description, canonical, robots, H1–H6, images +
    alt, forms, buttons, links, schema, OG, Twitter, favicon, viewport.
  - runs an initial set of **real** rules (see rule list below) against the real DOM.
  - builds Issues from failed checks (enforce the 1:1 invariant), computes real scores.
  - persists everything.
- Dashboard renders the **real** result for that site: health ring, severity donut,
  score cards, top issues, issues table with working drawer (what we found / business
  impact / recommended fix + code / mark resolved).
- `scripts/smoke.sh` scans a real public URL (e.g. https://example.com) end to end and
  asserts a persisted report with real, non-empty findings. This is the gate that
  proves "real integration."

**Phase-1 real rules (implement fully):** title exists + length, meta description
exists + length, canonical present, robots, viewport meta, H1 count + heading
hierarchy, every img has alt, links with empty/`#`/`javascript:` href, inline event
handlers, inline styles, deprecated tags, GA4/GTM/FB-pixel detection, external scripts
missing async/defer, OG + Twitter card tags present.

## PHASE 2 — Multi-page crawl + live progress
- Crawler: same-origin, dedupe, ≤10 pages, real screenshots + HTML + metadata each.
- Job queue (in-process is fine for MVP) driving the pipeline as independent stages;
  a failing stage yields partial results and NEVER aborts the run.
- "Analyzing" view: real progress via SSE (polling fallback) — 15-stage timeline,
  %, gradient bar, live stat cards (pages, screenshots, checks run, AI reviews),
  terminal-style live log. All values real, from the job.
- Pages view: per-page cards with real screenshot thumbnails + per-page mini scores;
  click filters issues by page.

## PHASE 3 — Deep real analyzers (each independent, degrade gracefully)
- Lighthouse per page (perf/a11y/SEO/best-practices; LCP/CLS/INP/FCP/TBT; store raw JSON).
- axe-core per page (real accessibility violations → checks → issues).
- Security headers + TLS probe (CSP, HSTS, X-Content-Type-Options, X-Frame-Options,
  Referrer-Policy, Permissions-Policy, cookie flags, cert expiry, TLS version, Server
  leak). Console-error capture via Playwright. Broken internal links (real 4xx),
  redirect chains, mixed content. Contrast via wcag-contrast. Focus visibility.

## PHASE 4 — Real AI layer (provider-agnostic, OpenAI default)
- `AIProvider` interface: `complete(prompt, opts)`, `vision(imageB64, prompt, opts)`.
  **Gemini implementation first** — read `GEMINI_API_KEY`, `AI_MODEL`, `AI_VISION_MODEL`
  from env (default model `gemini-3.5-flash`). Keep OpenAI/Claude/Ollama swappable by
  config. All outputs **zod-validated JSON** (use Gemini's JSON/response-schema mode).
- Prompt files in `lib/ai/prompts/`: vision.md, html-review.md, cross-page.md,
  fix-generator.md, chat.md. Never hardcode prompts.
- Vision review (real screenshot per page), HTML review (real extracted data +
  Lighthouse summary + rule results), cross-page consistency, fix generator
  (explanation + business impact + recommended fix + real code per issue).
- `POST /api/chat { siteId, message }` answers **strictly** from the stored analysis of
  that site (inject real scores/issues/metrics; refuse out-of-scope questions).

## PHASE 5 — Breadth, scores, report, polish
- Port the full check catalog from the prototype's `CHECKS` (19 categories, 331 checks)
  as CheckDefinitions so the registry lists every check with real category + severity.
  Long-tail rules may return `not-evaluated` (shown as N/A, NOT pass); the ~35 priority
  rules above must be real.
- Check registry view: accordion by category, per-check pass/fail/warning + severity
  chip, search + filters + status pills, data-source chips, reconciliation banner.
- Configurable scoring engine: per-rule weights in ONE config file → 6 category scores
  + overall health (0–100), severity-weighted deductions.
- PDF report route (Playwright print-to-PDF): exec summary, scores, charts, issues +
  fixes, screenshots. Projects multi-site history. Empty/loading/error states.
  Responsive at 360/768/920/1280 per the prototype breakpoints.

---

## API surface
`POST /api/analyze {url}` → `{jobId}` · `GET /api/jobs/:id` (SSE/polling) ·
`GET /api/sites` · `GET /api/sites/:id/report` · `POST /api/chat {siteId,message}` ·
`PATCH /api/issues/:id` (resolve/reopen) · `GET /api/report/:id/pdf`

## Quality bar
Strict TS, no `any`. Business logic in `lib/` services, not routes/components.
Centralized config (max pages, timeouts, weights, AI model, limits, thresholds).
Structured logging (pino). Per-analyzer error isolation. Unit tests for rule engine,
scoring, and one analyzer. `scripts/smoke.sh` must stay green from Phase 1 onward.
