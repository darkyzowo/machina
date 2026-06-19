#!/usr/bin/env node
// pass-ceiling.js — PreToolUse (Edit|Write): Tier A pass ceiling (project-scoped)

const fs = require('fs');
const path = require('path');
const {
  findProjectRoot,
  readState,
  writeState,
  sessionId,
  appendTelemetry,
} = require('./harness-lib');

let input = {};
if (!process.stdin.isTTY) {
  try {
    const raw = fs.readFileSync(0, 'utf8').trim();
    if (raw) input = JSON.parse(raw);
  } catch (_) {}
}

const toolInput = input.tool_input || {};
const filePath = toolInput.file_path || toolInput.path || '';
const projectRoot = findProjectRoot(filePath ? path.dirname(filePath) : process.cwd());

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

const state = readState(projectRoot);
state.pass_count = counter.count;
writeState(projectRoot, state);

if (counter.count >= 5) {
  appendTelemetry(projectRoot, { event: 'halt', reason: 'pass_ceiling', pass: counter.count });
  process.stdout.write(
    `MACHINA PASS CEILING (${counter.count}/5) — HALT.\n` +
      `Do not make further edits. Report current state to human for review.\n` +
      `Run /machina reset after human review clears the loop.`
  );
  process.exit(1);
}

if (counter.count === 4) {
  process.stdout.write('MACHINA PASS 4/5 — next edit triggers halt. Run external verifiers now.');
}

process.exit(0);
