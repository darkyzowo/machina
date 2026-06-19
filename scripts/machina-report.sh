#!/usr/bin/env bash
# machina-report.sh — summarize .machina/telemetry.jsonl for a project
set -uo pipefail

TARGET="${1:-.}"
ROOT="$(cd "$TARGET" && pwd)"
TELEMETRY="$ROOT/.machina/telemetry.jsonl"

echo "══════════════════════════════════════════════════════════════"
echo "  Machina Report — $(basename "$ROOT")"
echo "══════════════════════════════════════════════════════════════"

if [ -f "$ROOT/.machina/state.json" ]; then
  echo ""
  echo "Current state:"
  cat "$ROOT/.machina/state.json"
fi

if [ ! -f "$TELEMETRY" ]; then
  echo ""
  echo "No telemetry yet (.machina/telemetry.jsonl absent)."
  exit 0
fi

node -e "
const fs = require('fs');
const path = process.argv[1];
const lines = fs.readFileSync(path, 'utf8').trim().split('\n').filter(Boolean);
const events = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

const byType = {};
const halts = events.filter(e => e.event === 'halt');
const verifiers = events.filter(e => e.event === 'verifier');
const phaseBlocks = events.filter(e => e.event === 'phase_block');
const uxSkipped = events.filter(e => e.event === 'ux_skipped');

for (const e of events) {
  byType[e.event] = (byType[e.event] || 0) + 1;
}

console.log('');
console.log('Event counts:', JSON.stringify(byType, null, 2));
console.log('');
console.log('Pass-ceiling halts:', halts.length);
console.log('Phase gate blocks:', phaseBlocks.length);
console.log('Verifier runs:', verifiers.length);
console.log('UX SKIPPED events:', uxSkipped.length);

const redToGreen = [];
let redTs = null;
for (const e of events) {
  if (e.event === 'phase_enter' && e.phase === 'red') redTs = new Date(e.ts).getTime();
  if (e.event === 'phase_enter' && e.phase === 'green' && redTs) {
    redToGreen.push(new Date(e.ts).getTime() - redTs);
    redTs = null;
  }
}
if (redToGreen.length) {
  redToGreen.sort((a, b) => a - b);
  const mid = redToGreen[Math.floor(redToGreen.length / 2)];
  console.log('Median red→green ms:', mid);
}
" "$TELEMETRY"

echo ""
echo "══════════════════════════════════════════════════════════════"
