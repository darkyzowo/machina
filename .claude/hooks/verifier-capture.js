#!/usr/bin/env node
// verifier-capture.js — PostToolUse (Bash): capture verifier output to .machina/verifiers/

const fs = require('fs');
const path = require('path');
const {
  findProjectRoot,
  readState,
  writeState,
  verifierDir,
  appendTelemetry,
} = require('./harness-lib');

const VERIFIER_COMMANDS = [
  { pattern: /\bnpm test\b/, gate: 'red', advanceOnNonZero: true, advancePhase: 'green' },
  { pattern: /\bnpm run test\b/, gate: 'red', advanceOnNonZero: true, advancePhase: 'green' },
  { pattern: /\bvitest\b/, gate: 'red', advanceOnNonZero: true, advancePhase: 'green' },
  { pattern: /\bpytest\b/, gate: 'red', advanceOnNonZero: true, advancePhase: 'green' },
  { pattern: /\bnpm test\b/, gate: 'green', advanceOnZero: true, advancePhase: 'refactor' },
  { pattern: /\bnpm run (lint|typecheck|build)\b/, gate: 'ci', advanceOnZero: true },
];

let input = {};
if (!process.stdin.isTTY) {
  try {
    const raw = fs.readFileSync(0, 'utf8').trim();
    if (raw) input = JSON.parse(raw);
  } catch (_) {}
}

const toolInput = input.tool_input || {};
const command = toolInput.command || '';
if (!command) process.exit(0);

const projectRoot = findProjectRoot(process.cwd());
const state = readState(projectRoot);
const outDir = verifierDir(projectRoot, state);
fs.mkdirSync(outDir, { recursive: true });

const stdout = input.tool_output || input.stdout || '';
const stderr = input.stderr || '';
const exitCode = typeof input.exit_code === 'number' ? input.exit_code : 0;
const combined = `exit:${exitCode}\ncommand:${command}\n---stdout---\n${stdout}\n---stderr---\n${stderr}`;

let matched = false;
for (const rule of VERIFIER_COMMANDS) {
  if (!rule.pattern.test(command)) continue;
  matched = true;

  const gateName = rule.gate === 'ci' ? 'ci.txt' : `${rule.gate}.txt`;
  fs.writeFileSync(path.join(outDir, gateName), combined, 'utf8');

  appendTelemetry(projectRoot, {
    event: 'verifier',
    gate: rule.gate,
    exit: exitCode,
    command: command.slice(0, 120),
  });

  if (state.phase === 'red' && rule.gate === 'red' && rule.advanceOnNonZero && exitCode !== 0) {
    state.phase = 'green';
    writeState(projectRoot, state);
    appendTelemetry(projectRoot, { event: 'phase_exit', phase: 'red', outcome: 'pass' });
    appendTelemetry(projectRoot, { event: 'phase_enter', phase: 'green' });
  } else if (state.phase === 'green' && rule.gate === 'green' && rule.advanceOnZero && exitCode === 0) {
    state.phase = 'refactor';
    writeState(projectRoot, state);
    appendTelemetry(projectRoot, { event: 'phase_exit', phase: 'green', outcome: 'pass' });
    appendTelemetry(projectRoot, { event: 'phase_enter', phase: 'refactor' });
  }
  break;
}

if (!matched && /\b(agent-browser|curl)\b/.test(command)) {
  fs.writeFileSync(path.join(outDir, 'ux.txt'), combined, 'utf8');
  appendTelemetry(projectRoot, { event: 'verifier', gate: 'ux', exit: exitCode });
}

process.exit(0);
