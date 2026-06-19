#!/usr/bin/env node
// phase-gate.js — PreToolUse (Edit|Write): Tier A phase enforcement

const path = require('path');
const { readHookInput, block, hookCwd } = require('./harness-hook-utils');
const {
  findProjectRoot,
  readState,
  classifyWrite,
  allowedWrite,
  appendTelemetry,
} = require('./harness-lib');

const input = readHookInput();
const toolInput = input.tool_input || {};
const filePath = toolInput.file_path || toolInput.path || '';
if (!filePath) process.exit(0);

const projectRoot = findProjectRoot(hookCwd(input, filePath));
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
  block(
    `MACHINA PHASE GATE — write blocked.\n` +
      `  file: ${path.basename(filePath)} (${fileClass})\n` +
      `  phase: ${state.phase} | rigor: ${state.rigor}\n` +
      `  reason: ${reason}\n` +
      `  hint: /machina status | /machina next`
  );
}

process.exit(0);
