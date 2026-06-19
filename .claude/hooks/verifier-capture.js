#!/usr/bin/env node
// verifier-capture.js — PostToolUse + PostToolUseFailure (Bash): verifier artifacts

const fs = require('fs');
const path = require('path');
const { readHookInput, hookCwd } = require('./harness-hook-utils');
const {
  findProjectRoot,
  readState,
  writeState,
  verifierDir,
  appendTelemetry,
} = require('./harness-lib');

const input = readHookInput();
const toolInput = input.tool_input || {};
const command = toolInput.command || '';
if (!command) process.exit(0);

const { stdout, stderr, exitCode } = (function parse() {
  const tr = input.tool_response || {};
  let code = 0;
  if (typeof tr.exitCode === 'number') code = tr.exitCode;
  else if (typeof tr.exit_code === 'number') code = tr.exit_code;
  else if (typeof input.exit_code === 'number') code = input.exit_code;
  else if (input.error && /non-zero|exit code|exited with/i.test(String(input.error))) code = 1;
  return {
    stdout: tr.stdout ?? input.tool_output ?? input.stdout ?? '',
    stderr: tr.stderr ?? input.stderr ?? '',
    exitCode: code,
  };
})();

const projectRoot = findProjectRoot(hookCwd(input, ''));
const state = readState(projectRoot);
const outDir = verifierDir(projectRoot, state);
fs.mkdirSync(outDir, { recursive: true });

const combined = `exit:${exitCode}\ncommand:${command}\n---stdout---\n${stdout}\n---stderr---\n${stderr}`;

function writeArtifact(name) {
  fs.writeFileSync(path.join(outDir, name), combined, 'utf8');
}

function isTestCmd(cmd) {
  return /\b(npm test|npm run test|pnpm test|pnpm run test|yarn test|vitest|jest|pytest|go test|cargo test|dotnet test|phpunit)\b/.test(
    cmd
  );
}

function isCiCmd(cmd) {
  return /\b(npm run (lint|typecheck|build|check)|pnpm (lint|run lint|run typecheck|run build)|yarn (lint|build|typecheck)|ruff check|eslint|tsc\b|cargo (clippy|build)|go vet|make (verify|ci-local|harness-test))\b/.test(
    cmd
  );
}

function isUxCmd(cmd) {
  return /\b(agent-browser|playwright|npx playwright)\b/.test(cmd) || /\bcurl\b/.test(cmd);
}

function afterCiPass() {
  if (exitCode !== 0 || state.phase !== 'ci_gates') return;
  if (state.ui_touched) {
    state.phase = 'ux_gate';
    appendTelemetry(projectRoot, { event: 'phase_enter', phase: 'ux_gate' });
  } else {
    state.phase = 'task_complete';
    state.ux_gate = 'skipped';
    state.ux_skip_reason = 'no_ui_surface';
    appendTelemetry(projectRoot, { event: 'phase_enter', phase: 'task_complete' });
  }
  writeState(projectRoot, state);
}

function afterUxRun() {
  if (state.ui_touched) {
    state.ux_gate = exitCode === 0 ? 'passed' : 'failed';
    writeState(projectRoot, state);
  }
}

let matched = false;

if (isTestCmd(command)) {
  matched = true;
  if (state.phase === 'red') {
    writeArtifact('red.txt');
    appendTelemetry(projectRoot, { event: 'verifier', gate: 'red', exit: exitCode, command: command.slice(0, 120) });
    if (exitCode !== 0) {
      state.phase = 'green';
      writeState(projectRoot, state);
      appendTelemetry(projectRoot, { event: 'phase_exit', phase: 'red', outcome: 'pass' });
      appendTelemetry(projectRoot, { event: 'phase_enter', phase: 'green' });
    }
  } else if (state.phase === 'green' || state.phase === 'refactor') {
    writeArtifact('green.txt');
    appendTelemetry(projectRoot, { event: 'verifier', gate: 'green', exit: exitCode, command: command.slice(0, 120) });
    if (exitCode === 0 && state.phase === 'green') {
      state.phase = 'refactor';
      writeState(projectRoot, state);
      appendTelemetry(projectRoot, { event: 'phase_exit', phase: 'green', outcome: 'pass' });
      appendTelemetry(projectRoot, { event: 'phase_enter', phase: 'refactor' });
    }
  } else if (state.phase === 'ci_gates' && exitCode === 0) {
    writeArtifact('ci.txt');
    appendTelemetry(projectRoot, { event: 'verifier', gate: 'ci', exit: exitCode, command: command.slice(0, 120) });
    afterCiPass();
  } else {
    writeArtifact(exitCode === 0 ? 'green.txt' : 'red.txt');
    appendTelemetry(projectRoot, { event: 'verifier', gate: exitCode === 0 ? 'green' : 'red', exit: exitCode });
  }
} else if (isCiCmd(command)) {
  matched = true;
  writeArtifact('ci.txt');
  appendTelemetry(projectRoot, { event: 'verifier', gate: 'ci', exit: exitCode, command: command.slice(0, 120) });
  if (exitCode === 0 && state.phase === 'refactor') {
    state.phase = 'ci_gates';
    writeState(projectRoot, state);
    appendTelemetry(projectRoot, { event: 'phase_enter', phase: 'ci_gates' });
    afterCiPass();
  } else if (exitCode === 0 && state.phase === 'ci_gates') {
    afterCiPass();
  }
} else if (isUxCmd(command)) {
  matched = true;
  writeArtifact('ux.txt');
  appendTelemetry(projectRoot, { event: 'verifier', gate: 'ux', exit: exitCode });
  afterUxRun();
  if (exitCode === 0 && state.phase === 'ux_gate') {
    state.phase = 'task_complete';
    state.ux_gate = 'passed';
    writeState(projectRoot, state);
    appendTelemetry(projectRoot, { event: 'phase_enter', phase: 'task_complete' });
  }
}

if (!matched) process.exit(0);
process.exit(0);
