# Demo video — 3-minute script (shot-by-shot)

**Target: 2:50 runtime.** Record screen at 1920×1080, app at http://localhost:3000
(or the deployed URL — better for judges). Speak naturally; lines below are ~140
words/min pace. **Prep before recording:** one finished scan of a real site
(namastedev.com works — rich findings), AI provider live, server warm.

---

### SHOT 1 — The problem (0:00 – 0:20) · face cam or home page

> "Every business has a website. Almost none of them know what's silently broken
> on it — the missing alt text losing them customers, the security header that's
> an open door, the 4-megabyte image killing their Google ranking. Audits cost
> agencies hundreds of dollars and take days. I built a doctor that does it in
> minutes."

*Screen: home page — "Your website, diagnosed in minutes."*

### SHOT 2 — Start a scan (0:20 – 0:40) · type URL, hit Run diagnosis

> "This is Website Doctor. Paste any URL… and it gets to work — for real. A
> headless browser crawls up to ten pages, captures screenshots and HTML,
> runs Lighthouse and axe-core accessibility audits, probes security headers
> and TLS, checks every link — and then the AI takes over."

*Screen: Analyzing view — point at the 15-stage timeline + live telemetry log
scrolling real GET lines. Stay ~8 seconds; the log sells "this is real".*

### SHOT 3 — The dashboard (0:40 – 1:10) · finished report

> "Minutes later: a full diagnosis. One health score, six category scores,
> every issue ranked by severity. And this AI summary isn't a template — the
> model read this site's actual findings and wrote what a consultant would:
> what's costing money, and what to fix first."

*Screen: Overview — hover health ring → severity donut → AI summary panel.*

### SHOT 4 — The killer detail (1:10 – 1:50) · Issues → open one → drawer

> "Here's where it beats every checker I've used. Open any issue: what we
> found, the business impact in plain language, a recommended fix with
> copy-paste code — and the *actual HTML elements* from the page that are
> broken, with their selectors. Your developer doesn't hunt. They search,
> paste, done. These fix cards are AI-written for *this* element on *this*
> page — not generic advice."

*Screen: axe issue → scroll drawer: Affected elements → Copy → fix code block.
Then click "Mark resolved" to show triage.*

### SHOT 5 — Honesty + re-run (1:50 – 2:20) · Check registry

> "And one thing I refused to fake: trust. Every failed check creates exactly
> one issue — the numbers reconcile everywhere, enforced by the database.
> And when something can't run — a rate-limited AI call, a page Lighthouse
> couldn't load — it says so, in orange, with the reason… and a one-click
> re-run for just that check. No silent failures. No fake passes."

*Screen: registry — legend panel open → an orange "Not run — error" row →
click ↻ re-run → row updates live.*

### SHOT 6 — Chat + close (2:20 – 2:50) · AI assistant

> "Finally — ask it anything. The assistant answers only from this site's
> stored analysis — real numbers, real issue names — and politely refuses
> everything else. [type: What should I fix first?] …instant, prioritized,
> grounded.
>
> Website Doctor: real crawling, real audits, real AI — and honest about all
> of it. Built with AI, in four days. Thanks for watching."

*Screen: chat answering, then cut to home page hero for the last 3 seconds.*

---

## Recording tips

- **Windows**: Win+G (Game Bar) or OBS Studio (free) for screen capture; record
  voice in the same take — authentic beats polished.
- Do a scan RIGHT BEFORE recording so "SCAN: today" shows in the sidebar.
- Keep the mouse slow; pause a beat after each click.
- If a take runs long, cut Shot 5 to 15s (show the orange row, skip the re-run).
- Upload: YouTube **unlisted or public** (public link required by the rules),
  title "Website Doctor — OpenAI Codex Hackathon Demo".

## One-liner for the submission form

> Website Doctor is an AI-powered website QC platform: paste a URL, get a full
> health diagnosis in minutes — real crawling, Lighthouse + axe-core + security
> audits, AI vision review of every page, and copy-paste fixes tied to the exact
> broken elements. It never fakes a result: every number reconciles, and any
> check that couldn't run says so honestly with a one-click re-run.
