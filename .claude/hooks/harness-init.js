#!/usr/bin/env node
// harness-init.js — SessionStart: init .machina/state.json, inject slim harness context

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  resolveHarnessRoot,
  readState,
  writeState,
  readProfile,
  harnessContext,
  appendTelemetry,
  hasTasksMd,
  prepareForRedPhase,
  enforcementActive,
  projectHarnessActive,
  defaultState,
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

const resolved = resolveHarnessRoot(projectCwd);
const { root: projectRoot, tier, machinaDir } = resolved;

try {
  fs.mkdirSync(path.join(machinaDir, 'verifiers'), { recursive: true });
  const profile = readProfile(projectRoot);
  let state = readState(projectRoot);
  const stateFile = path.join(machinaDir, 'state.json');
  if (!fs.existsSync(stateFile)) {
    state = defaultState(profile, tier);
    writeState(projectRoot, state);
  }
  if (tier === 'project' && state.rigor === 'rigor' && state.phase === 'red' && !state.current_task && hasTasksMd(projectRoot)) {
    const prep = prepareForRedPhase(projectRoot, state);
    if (prep.ok) writeState(projectRoot, state);
  }
  appendTelemetry(projectRoot, {
    event: 'session_start',
    tier,
    rigor: state.rigor,
    phase: state.phase,
    task: state.current_task,
  });
} catch (_) {}

const harnessMd = path.join(os.homedir(), '.claude', 'machina', 'harness.md');
let rulesNote = '';
try {
  if (!fs.existsSync(harnessMd)) {
    rulesNote = '\n[harness] WARNING: harness.md missing. Re-run: make global-setup';
  }
} catch (_) {}

process.stdout.write('## MACHINA HARNESS ACTIVE\n\n' + harnessContext(projectRoot, tier) + rulesNote);
