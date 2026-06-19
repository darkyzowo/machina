#!/usr/bin/env node
// harness-init.js — SessionStart: init .machina/state.json, inject slim harness context

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  findProjectRoot,
  defaultState,
  readState,
  writeState,
  readProfile,
  harnessContext,
  appendTelemetry,
} = require('./harness-lib');

let projectCwd = process.cwd();
if (!process.stdin.isTTY) {
  try {
    const raw = fs.readFileSync(0, 'utf8').trim();
    if (raw) {
      const payload = JSON.parse(raw);
      projectCwd = payload.cwd || payload.working_directory || process.cwd();
    }
  } catch (_) {}
}

const projectRoot = findProjectRoot(projectCwd);
const machinaDir = path.join(projectRoot, '.machina');

try {
  fs.mkdirSync(path.join(machinaDir, 'verifiers'), { recursive: true });
  const profile = readProfile(projectRoot);
  let state = readState(projectRoot);
  if (!fs.existsSync(path.join(machinaDir, 'state.json'))) {
    state = defaultState(profile);
    writeState(projectRoot, state);
  }
  appendTelemetry(projectRoot, { event: 'session_start', rigor: state.rigor, phase: state.phase });
} catch (_) {}

const harnessMd = path.join(os.homedir(), '.claude', 'machina', 'harness.md');
let rulesNote = '';
try {
  if (!fs.existsSync(harnessMd)) {
    rulesNote = '\n[harness] WARNING: harness.md missing. Re-run: make global-setup';
  }
} catch (_) {}

process.stdout.write('## MACHINA HARNESS ACTIVE\n\n' + harnessContext(projectRoot) + rulesNote);
