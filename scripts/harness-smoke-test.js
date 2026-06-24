#!/usr/bin/env node
// harness-smoke-test.js — verify global revamp hooks without a live Claude session
// Usage: node ~/.claude/scripts/harness-smoke-test.js

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const HOOKS = path.join(os.homedir(), '.claude', 'hooks');
const lib = require(path.join(HOOKS, 'harness-lib'));

function runHook(name, payload) {
  const r = spawnSync(process.execPath, [path.join(HOOKS, name)], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 10000,
  });
  return { exit: r.status ?? 1, stderr: (r.stderr || '').trim(), stdout: (r.stdout || '').trim() };
}

function assert(label, ok, detail) {
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${label}${detail ? ' — ' + detail : ''}`);
  return ok;
}

let all = true;
const home = os.homedir();

console.log('=== Machina harness smoke test ===\n');

// 1. Tier resolution
const g = lib.resolveHarnessRoot(home);
const gs = lib.readState(g.root);
all &= assert('home → global tier', g.tier === 'global');
all &= assert('home → enforcement off', !lib.enforcementActive(g, gs));
all &= assert('no ~/ .machina', !fs.existsSync(path.join(home, '.machina')));
all &= assert('~/.claude/.machina exists', fs.existsSync(path.join(home, '.claude', '.machina', 'state.json')));

// 2. Pass ceiling ×6 from home — must NOT halt (exit 0)
const editPayload = (n) => ({
  cwd: home,
  tool_input: { file_path: path.join(home, 'smoke-test-' + n + '.txt'), content: 'x' },
});
let blocked = false;
for (let i = 1; i <= 6; i++) {
  const r = runHook('pass-ceiling.js', editPayload(i));
  if (r.exit === 2) blocked = true;
}
all &= assert('pass-ceiling ×6 from home (no halt)', !blocked, blocked ? 'halted early' : 'all exit 0');

// 3. Secret guard — must block planted AWS key
const secretPayload = {
  cwd: home,
  tool_input: {
    file_path: path.join(home, 'smoke-secret.txt'),
    content: 'aws_key = AKIAIOSFODNN7EXAMPLE',
  },
};
const sec = runHook('secret-guard.js', secretPayload);
all &= assert('secret-guard blocks AWS key', sec.exit === 2, `exit ${sec.exit}`);

// 4. Secret guard — benign write passes
const okPayload = {
  cwd: home,
  tool_input: { file_path: path.join(home, 'smoke-ok.txt'), content: 'hello world' },
};
const ok = runHook('secret-guard.js', okPayload);
all &= assert('secret-guard allows benign write', ok.exit === 0, `exit ${ok.exit}`);

// 5. Phase gate from home — must pass (no project harness)
const pg = runHook('phase-gate.js', {
  cwd: home,
  tool_input: { file_path: path.join(home, 'app.ts'), content: 'export {}' },
});
all &= assert('phase-gate no-op from home', pg.exit === 0, `exit ${pg.exit}`);

console.log('\n' + (all ? 'ALL PASS — revamp healthy' : 'SOME FAIL — check output above'));
process.exit(all ? 0 : 1);
