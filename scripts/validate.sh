#!/usr/bin/env bash
# Quality gate. Runs the checks that exist; fails hard if any present check fails.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

fail=0
have() { command -v "$1" >/dev/null 2>&1; }
PM="pnpm"; have pnpm || PM="npm"

run_if_script() {  # run "pnpm <script>" only if that script exists in package.json
  local s="$1"
  if [ -f package.json ] && grep -q "\"$s\"" package.json; then
    echo "▶ $PM run $s"
    $PM run "$s" || { echo "✗ $s failed"; fail=1; }
  else
    echo "· skip $s (not defined yet)"
  fi
}

if [ ! -f package.json ]; then
  echo "· no package.json yet — foundation not scaffolded, nothing to validate"
  exit 0
fi

run_if_script typecheck
run_if_script lint
run_if_script build
run_if_script test

# Real-integration smoke test (only once it exists and app is built)
if [ -f scripts/smoke.sh ] && grep -q "SMOKE_READY" scripts/smoke.sh; then
  echo "▶ smoke test"
  bash scripts/smoke.sh || { echo "✗ smoke failed"; fail=1; }
else
  echo "· skip smoke (not ready yet)"
fi

if [ "$fail" -ne 0 ]; then echo "❌ validate FAILED"; exit 1; fi
echo "✅ validate passed"
