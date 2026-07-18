#!/usr/bin/env bash
# REAL-INTEGRATION SMOKE TEST — proves the scan path is REAL end to end:
# boots the built app, POSTs /api/analyze for a live public URL, polls the job
# to completion, then asserts the persisted report contains real, non-empty
# extracted data and real check results.
# SMOKE_READY
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

PORT="${SMOKE_PORT:-4310}"
URL="${SMOKE_URL:-https://example.com}"
BASE="http://localhost:$PORT"

if [ ! -d .next ]; then
  echo "smoke: no .next build found — run 'pnpm build' first"
  exit 1
fi

echo "smoke: starting app on :$PORT"
# Lean AI budget for the gate: 2 AI calls max, no inter-call gaps — the smoke
# proves the REAL path end to end without draining free-tier quota or stalling
# on rate-limit waits.
PORT="$PORT" AI_MAX_VISION_PAGES=0 AI_MAX_HTML_PAGES=1 AI_MAX_FIX_ISSUES=1 AI_CALL_GAP_MS=0 pnpm start >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

# Wait for the server to accept connections.
up=0
for _ in $(seq 1 40); do
  if curl -s -o /dev/null "$BASE/api/sites"; then up=1; break; fi
  sleep 0.5
done
if [ "$up" -ne 1 ]; then echo "smoke: ✗ server did not start"; exit 1; fi

echo "smoke: POST /api/analyze { url: $URL }"
RESP=$(curl -s -X POST "$BASE/api/analyze" -H 'Content-Type: application/json' -d "{\"url\":\"$URL\"}")
JOB_ID=$(node -e "const d=JSON.parse(process.argv[1]); if(!d.jobId){process.exit(1)}; console.log(d.jobId)" "$RESP") || {
  echo "smoke: ✗ analyze did not return a jobId: $RESP"; exit 1; }
SITE_ID=$(node -e "console.log(JSON.parse(process.argv[1]).siteId)" "$RESP")
echo "smoke: jobId=$JOB_ID siteId=$SITE_ID"

# Poll the job to completion (max ~360s — AI stages add real Gemini calls).
STATUS="queued"
for _ in $(seq 1 360); do
  JOB=$(curl -s "$BASE/api/jobs/$JOB_ID")
  STATUS=$(node -e "console.log(JSON.parse(process.argv[1]).status)" "$JOB" 2>/dev/null || echo "unknown")
  case "$STATUS" in
    completed|partial) break ;;
    failed) echo "smoke: ✗ job failed: $(node -e "console.log(JSON.parse(process.argv[1]).error)" "$JOB")"; exit 1 ;;
  esac
  sleep 1
done
if [ "$STATUS" != "completed" ] && [ "$STATUS" != "partial" ]; then
  echo "smoke: ✗ job did not finish in time (status: $STATUS)"; exit 1
fi
echo "smoke: job $STATUS"

# Fetch the persisted report and assert REAL findings.
REPORT_FILE=$(mktemp)
curl -s -o "$REPORT_FILE" "$BASE/api/sites/$SITE_ID/report"
node -e "
const r = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'));
const fail = (m) => { console.error('smoke: ✗ ' + m); process.exit(1); };
if (!r.pages || r.pages.length < 1) fail('no pages persisted');
const page = r.pages[0];
if (!page.title || page.title.trim() === '') fail('page has no real extracted title');
if (!r.checks || r.checks.length < 10) fail('fewer than 10 check results persisted');
const evaluated = r.checks.filter(c => c.status !== 'not-evaluated');
if (evaluated.length < 5) fail('fewer than 5 checks actually evaluated');
const titleCheck = r.checks.find(c => c.checkId === 'seo-title-exists');
if (!titleCheck) fail('title check missing from results');
if (typeof r.scores.health !== 'number') fail('no health score persisted');
const failedChecks = r.checks.filter(c => c.status === 'fail');
if (failedChecks.length !== r.issues.length) fail('1:1 invariant broken: ' + failedChecks.length + ' failed checks vs ' + r.issues.length + ' issues');
for (const i of r.issues) {
  const src = r.checks.find(c => c.issueId === i.id);
  if (src && src.issueSeverity !== i.severity) fail('severity mismatch between check and issue ' + i.id);
}
console.log('smoke: report OK — ' + r.pages.length + ' page(s), title \"' + page.title + '\", ' + evaluated.length + ' checks evaluated, ' + r.issues.length + ' issues (1:1 holds), health ' + r.scores.health);
" "$REPORT_FILE" || { rm -f "$REPORT_FILE"; exit 1; }
rm -f "$REPORT_FILE"

echo "smoke: ✅ real end-to-end scan verified"
exit 0
