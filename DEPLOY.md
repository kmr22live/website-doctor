# Deploying Website Doctor (public URL for judges)

The scanner runs Playwright + Lighthouse, which **do not work on serverless**
(Vercel/Netlify). Deploy to a real server. Two free options, ~10 minutes each.

## Option A — Render (recommended, simplest)

1. Push this repo to GitHub (see README "Publish the repo").
2. Go to https://dashboard.render.com → **New → Blueprint**.
3. Connect the GitHub repo — Render reads `render.yaml` and configures everything.
4. When prompted for env vars, paste your **AI_API_KEY** (Groq key, free at console.groq.com).
5. Click **Apply**. First build takes ~8-10 min (Docker image with Chromium).
6. Your public URL appears as `https://website-doctor-XXXX.onrender.com`.

After deploy, open the URL and **run one scan** (e.g. your own site) so judges land
on a filled dashboard, then keep that tab's link as the submission URL.

### Free-plan notes
- 512 MB RAM is tight for Lighthouse. `LIGHTHOUSE_MAX_PAGES=3` is preset; if scans
  show Lighthouse "not run" rows, set it to `0` in the Render env (perf checks show
  honest N/A) or bump the instance.
- Free instances sleep after idle — first request takes ~40s to wake. Wake it
  BEFORE judges click (open the URL yourself the morning of judging).
- Disk is ephemeral: scans reset on redeploy. Re-run one scan after each deploy.

## Option B — Railway

1. https://railway.app → New Project → Deploy from GitHub repo.
2. Railway auto-detects the `Dockerfile`.
3. Add env vars from `.env.example` (AI_PROVIDER=groq, AI_API_KEY=…, models).
4. Settings → Networking → **Generate Domain** → public URL.

## Sanity check after deploy

```
curl https://YOUR-URL/api/sites          # → {"sites":[...]}  (200)
```
Then scan `https://example.com` from the home page — completes in ~1 min and
proves the full real pipeline (crawl → checks → AI) works in production.
