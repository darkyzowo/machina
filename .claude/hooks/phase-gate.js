#!/usr/bin/env node
// phase-gate.js — PreToolUse (Edit|Write): Tier A phase enforcement (project + rigor only)

const path = require('path');
const { readHookInput, block, hookCwd } = require('./harness-hook-utils');
const {
  resolveHarnessRoot,
  readState,
  classifyWrite,
  allowedWrite,
  appendTelemetry,
  isUiFile,
  markUiTouched,
  projectHarnessActive,
} = require('./harness-lib');

const input = readHookInput();
const toolInput = input.tool_input || {};
const filePath = toolInput.file_path || toolInput.path || '';
if (!filePath) process.exit(0);

const resolved = resolveHarnessRoot(hookCwd(input, filePath));
if (!projectHarnessActive(resolved)) process.exit(0);

let state = readState(resolved.root);
const fileClass = classifyWrite(filePath);

if (state.rigor === 'rigor' && (fileClass === 'impl' || fileClass === 'test') && isUiFile(filePath)) {
  state = markUiTouched(resolved.root, state);
}

const { ok, reason } = allowedWrite(state.phase, state.rigor, fileClass, resolved.root, state, filePath);

if (!ok) {
  appendTelemetry(resolved.root, {
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
