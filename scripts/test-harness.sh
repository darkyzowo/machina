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
const lib = path.join(ROOT, '.claude', 'hooks', 'harness-lib');

function setupState(overrides) {
  fs.mkdirSync(path.join(TMP, '.machina', 'verifiers', 'default'), { recursive: true });
  const state = {
    phase: 'red',
    rigor: 'rigor',
    current_task: 'default',
    pass_count: 0,
    ui_touched: false,
    ux_gate: 'pending',
    ...overrides,
  };
  fs.writeFileSync(path.join(TMP, '.machina', 'state.json'), JSON.stringify(state));
  fs.writeFileSync(path.join(TMP, '.machina', 'rigor'), (state.rigor || 'rigor') + '\n');
  return state;
}

function writeVerifier(name, exitCode) {
  const dir = path.join(TMP, '.machina', 'verifiers', 'default');
  fs.writeFileSync(path.join(dir, name), 'exit:' + exitCode + '\ncommand:test\n');
}

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
  console.log('PASS:', msg);
}

const {
  allowedWrite,
  advancePhase,
  isSecuritySensitivePath,
  isUiFile,
  ciGatePassed,
} = require(lib);

setupState({ phase: 'red', rigor: 'rigor' });

let r = allowedWrite('red', 'rigor', 'impl', TMP, { current_task: 'default' }, '/src/foo.ts');
assert(!r.ok, 'red blocks impl');

r = allowedWrite('red', 'rigor', 'test', TMP, { current_task: 'default' }, '/src/foo.test.ts');
assert(r.ok, 'red allows test');

r = allowedWrite('red', 'ship', 'impl', TMP, {}, '/src/foo.ts');
assert(r.ok, 'ship allows impl (non-sensitive)');

r = allowedWrite('orient', 'ship', 'impl', TMP, {}, '/src/api/auth.ts');
assert(!r.ok, 'ship blocks sensitive path without security spec');

assert(isSecuritySensitivePath('/src/api/users.ts'), 'detects api path');
assert(isUiFile('/src/components/Button.tsx'), 'detects UI file');

setupState({ phase: 'ci_gates', rigor: 'rigor' });
r = allowedWrite('ci_gates', 'rigor', 'impl', TMP, { current_task: 'default', ui_touched: false }, '/src/foo.ts');
assert(!r.ok, 'ci_gates blocks impl without ci.txt');

writeVerifier('ci.txt', 0);
r = allowedWrite('ci_gates', 'rigor', 'impl', TMP, { current_task: 'default', ui_touched: false }, '/src/foo.ts');
assert(r.ok, 'ci_gates allows impl after ci pass');

setupState({ phase: 'task_complete', rigor: 'rigor' });
r = allowedWrite('task_complete', 'rigor', 'impl', TMP, { current_task: 'default' }, '/src/foo.ts');
assert(!r.ok, 'task_complete blocks impl');

setupState({ phase: 'red', rigor: 'rigor' });
writeVerifier('red.txt', 1);
let adv = advancePhase(TMP, JSON.parse(fs.readFileSync(path.join(TMP, '.machina', 'state.json'), 'utf8')));
assert(adv.ok && adv.to === 'green', 'advance red→green with red artifact');

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
