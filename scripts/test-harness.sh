#!/usr/bin/env bash
# test-harness.sh — acceptance tests for Machina v3 harness hooks
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "── Harness acceptance tests ─────────────────────────────────────────────"

node -e "
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const ROOT = process.argv[1];
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'machina-test-'));

fs.mkdirSync(path.join(TMP, '.machina', 'verifiers', 'default'), { recursive: true });
fs.writeFileSync(
  path.join(TMP, '.machina', 'state.json'),
  JSON.stringify({ phase: 'red', rigor: 'rigor', current_task: 'default', pass_count: 0 })
);
fs.writeFileSync(path.join(TMP, '.machina', 'rigor'), 'rigor\n');

const { allowedWrite } = require(path.join(ROOT, '.claude', 'hooks', 'harness-lib'));

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
  console.log('PASS:', msg);
}

let r = allowedWrite('red', 'rigor', 'impl', TMP, { current_task: 'default' });
assert(!r.ok, 'red blocks impl');

r = allowedWrite('red', 'rigor', 'test', TMP, { current_task: 'default' });
assert(r.ok, 'red allows test');

r = allowedWrite('red', 'ship', 'impl', TMP, {});
assert(r.ok, 'ship allows impl');

const sg = path.join(ROOT, '.claude', 'hooks', 'secret-guard.js');
let s = spawnSync('node', [sg], {
  input: JSON.stringify({ tool_input: { content: 'const key = \"AKIAIOSFODNN7EXAMPLE\";' } }),
  encoding: 'utf8',
});
assert(s.status === 2, 'secret-guard blocks AWS key with exit 2');

s = spawnSync('node', [sg], {
  input: JSON.stringify({ tool_input: { content: 'const x = 1;' } }),
  encoding: 'utf8',
});
assert(s.status === 0, 'secret-guard allows normal code');

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) {}
" "$ROOT"

echo ""
echo "All harness acceptance tests passed."
