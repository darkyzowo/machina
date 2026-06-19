#!/usr/bin/env node
// phase-gate.js — PreToolUse (Edit|Write): Tier A phase enforcement

const path = require('path');
const {
  findProjectRoot,
  readState,
  classifyWrite,
  allowedWrite,
  appendTelemetry,
} = require('./harness-lib');

let input = {};
if (!process.stdin.isTTY) {
  try {
    const raw = require('fs').readFileSync(0, 'utf8').trim();
    if (raw) input = JSON.parse(raw);
  } catch (_) {}
}

const toolInput = input.tool_input || {};
const filePath = toolInput.file_path || toolInput.path || '';
if (!filePath) process.exit(0);

const projectRoot = findProjectRoot(path.dirname(filePath));
const state = readState(projectRoot);
const fileClass = classifyWrite(filePath);
const { ok, reason } = allowedWrite(state.phase, state.rigor, fileClass, projectRoot, state);

if (!ok) {
  appendTelemetry(projectRoot, {
    event: 'phase_block',
    phase: state.phase,
    rigor: state.rigor,
    file: path.basename(filePath),
    file_class: fileClass,
  });
  process.stdout.write(
    `MACHINA PHASE GATE — write blocked.\n` +
      `  file: ${path.basename(filePath)} (${fileClass})\n` +
      `  phase: ${state.phase} | rigor: ${state.rigor}\n` +
      `  reason: ${reason}\n` +
      `  hint: /machina status | /machina next`
  );
  process.exit(1);
}

process.exit(0);
