# Website Doctor — Claude Code handoff

Give Claude Code the **prompt** below (copy the whole fenced block), plus these two files from this project:

1. `Website Doctor.html` — the standalone UI prototype (design + UX contract; also contains the full 331-check catalog in its `CHECKS` array and all demo copy).
2. Your original spec documents (the two pasted specs: "Project Specification: Website Doctor AI" + "Additional Engineering Requirements").

---

## The prompt

```
You are building "Website Doctor" — an AI-powered website QC platform. The attached
standalone HTML file is the approved UI prototype: treat it as the design contract
(views, layout, copy, colors, interactions). The attached spec documents are the
product + engineering requirements. Implement the real product.

TECH STACK
- Frontend: Next.js (App Router) + React + TypeScript + TailwindCSS + shadcn/ui +
  Framer Motion + Recharts + React Query. Recreate the prototype's dark theme as
  Tailwind tokens: bg #07090F, panel rgba(255,255,255,0.035) with 1px
  rgba(255,255,255,0.09) border, radius 16-20px, accent gradient #2DD4BF→#3B82F6,
  severity colors rose #FB7185 / amber #FBBF24 / sky #38BDF8 / slate #94A3B8,
  fonts Space Grotesk + JetBrains Mono (numbers/URLs), Material Icons Outlined.
- Backend: Node.js + Express + TypeScript (strict, no `any`). SQLite via an ORM
  (Drizzle or Prisma) with a schema that ports cleanly to PostgreSQL.
- Monorepo: pnpm workspaces — apps/web, apps/api, packages/shared (types),
  packages/rules, packages/analyzers, packages/ai, packages/report.

VIEWS TO IMPLEMENT (match the prototype 1:1)
1. Projects — grid of scanned sites: health score + label (Good shape ≥75 /
   Needs attention ≥60 / At risk), pages/issues/critical chips, last scan,
   Open report, per-card Re-scan, New scan button.
2. New scan — URL input, sample chips, 4-step explainer, rule-name ticker.
3. Analyzing — live pipeline timeline (15 stages), progress %, gradient bar,
   4 live stat cards (pages, screenshots, checks run, AI reviews), terminal-style
   live log. Server-Sent Events (or polling fallback) for progress.
4. Dashboard
   - Overview: health ring, score profile radar with HTML legend (+ Leading/
     Lagging tags), severity donut, 6 score cards, top issues, AI summary,
     issues-by-category bars.
   - Issues: filterable table (search, category, severity, All/Open/Resolved),
     row click opens right drawer: what we found, business impact (amber panel),
     recommended fix + copyable code block, effort, source check id,
     mark resolved / reopen.
   - Check registry: ALL checks grouped in categories (accordion), per-check
     pass/fail/warning status, severity chip, search + severity filter +
     status pills, summary cards, data-source chips (Search Console, TLS &
     headers, W3C validators, Lighthouse, axe-core). Extract the full catalog
     from the prototype's CHECKS array (19 categories, 331 checks).
   - Pages: per-page cards with real screenshot thumbnails, P/S/A mini scores,
     LCP/CLS, click → issues filtered by page.
   - AI chat: website-aware assistant, suggestion chips, answers ONLY from the
     stored analysis data of the active site.

CORE INVARIANT (the prototype enforces this — keep it)
Every FAILED check creates exactly ONE issue with the SAME severity. Counts must
match everywhere: registry failed = issues total; severity breakdowns identical
in overview chips, donut, issues table, registry. Warnings are advisory and never
create issues. Show the reconciliation banner in the registry.

PIPELINE (queue-based background job; each stage independent, failures produce
partial results, never abort the run)
crawl (Playwright, ≤10 pages, same-origin, dedupe, screenshot + HTML + metadata)
→ discover pages → screenshots → extract HTML (Cheerio: title/meta/canonical/
robots/H1-H6/images+alt/forms/buttons/links/schema/OG/Twitter/favicon)
→ Lighthouse per page (perf/a11y/SEO/best-practices, LCP/CLS/INP/FCP/TBT; store
raw JSON) → axe-core per page → security headers & TLS fetch (CSP, HSTS,
X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy,
cookie flags, cert expiry, TLS version, Server header leak) → code validation
(W3C HTML/CSS validators or local equivalents, console errors via Playwright,
library CVE lookup against a vulnerable-versions list) → Search Console sync
(OAuth, optional; impressions/clicks per URL, flag 0-impression and clicked-4xx
pages; skip category gracefully when not connected) → rule engine → AI vision
review (screenshot, per page) → AI HTML review (per page) → cross-page
consistency → fix generator → score calculator → persist report.

RULE ENGINE
- Plugin architecture: one file per rule in packages/rules/<category>/<rule-id>.ts
  exporting { id, category, severity, appliesTo, evaluate(ctx): RuleResult }.
  Dynamic discovery (glob import) — adding a rule file requires zero orchestration
  changes. Port all 331 checks from the prototype catalog; stub bodies are
  acceptable for the long tail but the registry must list every check with its
  real category + severity, and at least these must be fully implemented:
  title/description/canonical/OG/Twitter/sitemap/robots, H1 & heading hierarchy,
  image alt + size + lazy-loading + next-gen formats, render-blocking CSS, font
  preload, form labels + required + submit, GA4/GTM/FB pixel, broken internal
  links (4xx), redirect chains, lorem ipsum, contrast (wcag-contrast), focus
  visibility, viewport meta, security headers set, mixed content, console errors,
  vulnerable libraries.
- Severity: check class severity (Critical/Warning/Opportunity/Notice) for
  passing rows; failed checks display their ISSUE severity
  (critical/high/medium/low) assigned by the prioritizer.

AI LAYER
- Provider abstraction: AIProvider interface (complete(prompt, opts), vision(...))
  with Gemini implementation first; OpenAI/Claude/Ollama swappable via config.
- All prompts as files in packages/ai/prompts/: vision.md, html-review.md,
  cross-page.md, fix-generator.md, chat.md. Structured JSON responses only
  (zod-validated).
- Fix generator: explanation, business impact, recommended fix + code
  (CSS/HTML/meta/alt/CTA) per issue.
- Chat endpoint answers strictly from the stored analysis (inject scores, issues,
  page metrics into the prompt context; refuse questions outside it).

DATA MODEL (packages/shared, zod + inferred TS types)
Website, Page, CrawlArtifact, CheckDefinition, CheckResult, Issue (1:1 with a
failed CheckResult; fields: severity, category, page(s), title, description,
businessImpact, fix, code, effort, sourceCheckId, status open/resolved),
Score (per category + overall health), AnalysisJob (stage, progress, logs),
AIResponse. Configurable scoring engine: per-rule weights in one config file;
severity-weighted deductions → 0-100 per category + overall.

API
POST /api/analyze { url } → { jobId }
GET  /api/jobs/:id (SSE stream or polling: stage, %, logs, live stats)
GET  /api/sites  ·  GET /api/sites/:id/report (scores, issues, checks, pages)
POST /api/chat { siteId, message }  ·  PATCH /api/issues/:id (resolve/reopen)
GET  /api/report/:id/pdf (Executive summary, scores, charts, issues + fixes,
screenshots — Playwright print-to-PDF of a report route)

QUALITY BAR
Strict TS everywhere; services hold all business logic (no logic in routes or
components); centralized config (max pages, timeouts, weights, AI model, limits,
thresholds); structured logging (pino); per-analyzer error isolation; unit tests
for rule engine, scoring, and one analyzer; seed script that loads the Grand
Meridian demo dataset from the prototype so the UI is reviewable without a live
crawl. Responsive to 360px (sidebar collapses to horizontal nav under 920px,
tables drop columns progressively — mirror the prototype's breakpoints).

DELIVERY ORDER
1. Monorepo + shared types + seeded demo data + dashboard shell reading the seed.
2. Crawler + extraction + job queue + Analyzing view with live progress.
3. Rule engine + registry (all 331 checks listed) + issues 1:1 invariant.
4. Lighthouse + axe + headers/TLS + code validation analyzers.
5. AI layer (vision, HTML, cross-page, fixes, chat) behind the provider interface.
6. Scores, PDF report, Search Console integration, polish.
Work phase by phase; after each phase run the app and verify against the
prototype before continuing.
```

---

## Implementation plan (what to include, checklist form)

**Phase 0 — Foundation (day 1)**
- pnpm monorepo, strict tsconfig, ESLint/Prettier, shared zod schemas
- SQLite schema (Drizzle/Prisma), seed with the demo dataset extracted from the prototype
- Tailwind theme tokens from the prototype palette

**Phase 1 — Crawl & artifacts**
- Playwright crawler service (≤10 pages, dedupe, same-origin, network-idle, screenshots, HTML, metadata)
- Cheerio extraction service; artifact storage on disk + DB rows
- Job queue (BullMQ or in-process queue for MVP) + SSE progress + Analyzing view

**Phase 2 — Checks & issues**
- Rule-engine core (glob-discovered plugins, RuleResult contract)
- Port the 331-check catalog (19 categories) from the prototype `CHECKS` array as CheckDefinitions
- Implement the ~35 priority rules fully; stubs return `not-evaluated` (shown as N/A, not pass)
- Issue builder enforcing the 1:1 failed-check→issue invariant + severity prioritizer

**Phase 3 — Deep analyzers**
- Lighthouse runner (store raw JSON), axe-core runner
- Security headers + TLS probe; W3C validation; console-error capture; CVE list lookup
- Search Console OAuth import (optional category, degrades gracefully)

**Phase 4 — AI**
- AIProvider interface + Gemini impl; prompt files; zod-validated JSON outputs
- Vision review, HTML review, cross-page consistency, fix generator, site-aware chat

**Phase 5 — Scores, report, polish**
- Configurable scoring engine (weights file) → 6 category scores + health
- PDF report route + Playwright export; Projects multi-site history
- Error/empty/loading states, responsive QA at 360/768/920/1280

**Future-proofing hooks (cheap now, per your spec)**
- Analyzer + rule registries are data-driven (extensions: Chrome extension, CI action, scheduled monitoring reuse the API)
- Provider-agnostic AI, PostgreSQL-ready schema, multi-user tables (org/user on Website) stubbed

**Env needed**: `GEMINI_API_KEY` (or other provider), optional Google Search Console OAuth creds.
