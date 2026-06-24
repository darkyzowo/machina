#!/usr/bin/env node
// pass-ceiling.js — PreToolUse (Edit|Write): Tier A pass ceiling (project + rigor only)

const fs = require('fs');
const path = require('path');
const { readHookInput, block, warn, hookCwd } = require('./harness-hook-utils');
const {
  resolveHarnessRoot,
  readState,
  writeState,
  sessionId,
  appendTelemetry,
  enforcementActive,
} = require('./harness-lib');

const input = readHookInput();
const toolInput = input.tool_input || {};
const filePath = toolInput.file_path || toolInput.path || '';
const resolved = resolveHarnessRoot(hookCwd(input, filePath));
const state = readState(resolved.root);

if (!enforcementActive(resolved, state)) process.exit(0);

const projectRoot = resolved.root;
const sid = sessionId();
const countsDir = path.join(projectRoot, '.machina', 'pass-counts');
const counterFile = path.join(countsDir, `${sid}.json`);

try {
  const now = Date.now();
  if (fs.existsSync(countsDir)) {
    for (const f of fs.readdirSync(countsDir)) {
      const fp = path.join(countsDir, f);
      try {
        if (now - fs.statSync(fp).mtimeMs > 86400000) fs.unlinkSync(fp);
      } catch (_) {}
    }
  }
} catch (_) {}

let counter = { count: 0 };
try {
  fs.mkdirSync(countsDir, { recursive: true });
  if (fs.existsSync(counterFile)) {
    counter = JSON.parse(fs.readFileSync(counterFile, 'utf8'));
  }
} catch (_) {}

counter.count += 1;
try {
  fs.writeFileSync(counterFile, JSON.stringify(counter), 'utf8');
} catch (_) {}

state.pass_count = counter.count;
writeState(projectRoot, state);

if (counter.count >= 5) {
  appendTelemetry(projectRoot, { event: 'halt', reason: 'pass_ceiling', pass: counter.count });
  block(
    `MACHINA PASS CEILING (${counter.count}/5) — HALT.\n` +
      `Do not make further edits. Report current state to human for review.\n` +
      `Run /machina reset after human review clears the loop.`
  );
}

if (counter.count === 4) {
  warn('MACHINA PASS 4/5 — next edit triggers halt. Run external verifiers now.');
}

process.exit(0);
