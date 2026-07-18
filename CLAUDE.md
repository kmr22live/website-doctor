# CLAUDE.md — Website Doctor (project rules)

You are building **Website Doctor**, a real AI-powered website QC product. This is NOT
a mock. Every scan must run real analysis on a real URL and store real results.

## Golden rules (read every session)
1. **Real integration only.** No hardcoded/fake results in the product path. A scan of
   a URL must actually fetch it, extract real data, run real checks, and persist real
   findings. Seed/demo data may exist ONLY as a dev fixture, clearly labelled, never as
   the default product output.
2. **Work from PROGRESS.md.** Do the next unchecked task. When done, check it off, add
   any newly discovered subtasks, and commit. Never skip the validation gate.
3. **Always leave the tree green.** After every task run `bash scripts/validate.sh`.
   If it fails, fix it before moving on. Never commit a red tree.
4. **Commit small and often**, one logical change per commit, clear messages.
5. **Demo-first ordering.** Prefer making a thin end-to-end slice REAL and working over
   building broad-but-dead scaffolding. The app must be runnable and demoable at the end
   of every phase.
6. **Never break a working feature to add a new one.** If a change regresses the smoke
   test, revert and try a smaller step.
7. If a task is ambiguous, pick the **simplest real implementation** that satisfies the
   spec and note the assumption in PROGRESS.md — do not stop and wait.

## Architecture (lean for reliability — chosen over the original monorepo on purpose)
- **Single Next.js (App Router) + TypeScript app.** API via route handlers under
  `app/api/*`. This is far easier to build overnight and to host than a split
  Express/monorepo. (The original monorepo split is a documented FUTURE refactor, not
  now — see design/original-handoff.md.)
- **DB:** SQLite via Drizzle ORM, schema written to port cleanly to Postgres later.
- **Heavy pipeline** (Playwright crawl, Lighthouse, axe) runs in a Node worker /
  long-running route, NOT edge/serverless. Guard it so the app still builds and the
  dashboard still renders even if a heavy dep is unavailable in the current env.
- **Analyzers & rules are plugins**: one file per rule, discovered dynamically (glob),
  so adding a rule needs zero orchestration changes.
- **AI is provider-agnostic** behind an `AIProvider` interface. **Default: OpenAI**
  (env `OPENAI_API_KEY`, model from config). Gemini/Claude/Ollama swappable by config.

## Tech + theme
Next.js App Router, React, TypeScript (strict, no `any`), TailwindCSS, shadcn/ui,
Framer Motion, Recharts, React Query, Drizzle+SQLite, Playwright, Cheerio, Lighthouse,
axe-core, zod, pino. Dark theme tokens from the prototype:
bg `#07090F`; panel `rgba(255,255,255,0.035)` + 1px `rgba(255,255,255,0.09)` border;
radius 16–20px; accent gradient `#2DD4BF→#3B82F6`; severity rose `#FB7185` / amber
`#FBBF24` / sky `#38BDF8` / slate `#94A3B8`; fonts Space Grotesk + JetBrains Mono;
Material Icons Outlined. `design/Website-Doctor-prototype.html` is the visual contract.

## Core invariant (keep exactly)
Every **failed** check creates exactly **one** issue with the **same severity**. Counts
must reconcile everywhere (registry failed total == issues total; identical severity
breakdowns in overview, donut, issues table, registry). **Warnings are advisory and
never create issues.** Show the reconciliation banner in the registry.

## Definition of done for any task
Code compiles (strict), lint passes, app builds, and — where the task touches the scan
path — `bash scripts/smoke.sh` produces a real report for a live URL.
