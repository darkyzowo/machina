#!/usr/bin/env node
// harness-lib.js — shared Machina v3 harness runtime (project-scoped state machine)

const fs = require('fs');
const path = require('path');
const os = require('os');

const PHASES = [
  'orient',
  'speckit_constitution',
  'speckit_specify',
  'security_spec',
  'speckit_plan',
  'speckit_tasks',
  'red',
  'green',
  'refactor',
  'ci_gates',
  'ux_gate',
  'task_complete',
];

const TEST_PATTERNS = [
  /\.test\.[cm]?[jt]sx?$/i,
  /\.spec\.[cm]?[jt]sx?$/i,
  /__tests__\//,
  /\/tests?\//,
  /_test\.py$/i,
  /test_.*\.py$/i,
];

const IMPL_PATTERNS = [
  /\.[cm]?[jt]sx?$/i,
  /\.py$/i,
  /\.go$/i,
  /\.rs$/i,
  /\.vue$/i,
  /\.svelte$/i,
];

function findProjectRoot(start) {
  let dir = path.resolve(start || process.cwd());
  for (let i = 0; i < 25; i++) {
    if (
      fs.existsSync(path.join(dir, '.machina')) ||
      fs.existsSync(path.join(dir, '.agent-profile')) ||
      fs.existsSync(path.join(dir, 'AGENTS.md')) ||
      fs.existsSync(path.join(dir, 'CLAUDE.md'))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(start || process.cwd());
}

function defaultState(profile) {
  return {
    phase: 'orient',
    rigor: 'ship',
    current_task: null,
    pass_count: 0,
    ux_gate: 'pending',
    security_spec: 'pending',
    profile: profile || 'lean',
    ui_touched: false,
  };
}

function readRigor(projectRoot) {
  const rigorFile = path.join(projectRoot, '.machina', 'rigor');
  try {
    const v = fs.readFileSync(rigorFile, 'utf8').trim().toLowerCase();
    if (v === 'rigor' || v === 'ship') return v;
  } catch (_) {}
  return null;
}

function readProfile(projectRoot) {
  try {
    const raw = fs.readFileSync(path.join(projectRoot, '.agent-profile'), 'utf8').trim().toLowerCase();
    if (['lean', 'standard', 'full'].includes(raw)) return raw;
  } catch (_) {}
  return 'lean';
}

function readState(projectRoot) {
  const stateFile = path.join(projectRoot, '.machina', 'state.json');
  const profile = readProfile(projectRoot);
  const rigorOverride = readRigor(projectRoot);
  let state = defaultState(profile);
  if (fs.existsSync(stateFile)) {
    try {
      state = { ...state, ...JSON.parse(fs.readFileSync(stateFile, 'utf8')) };
    } catch (_) {}
  }
  if (rigorOverride) state.rigor = rigorOverride;
  state.profile = profile;
  return state;
}

function writeState(projectRoot, state) {
  const machinaDir = path.join(projectRoot, '.machina');
  fs.mkdirSync(machinaDir, { recursive: true });
  fs.writeFileSync(
    path.join(machinaDir, 'state.json'),
    JSON.stringify(state, null, 2) + '\n',
    'utf8'
  );
}

function setRigor(projectRoot, rigor) {
  const machinaDir = path.join(projectRoot, '.machina');
  fs.mkdirSync(machinaDir, { recursive: true });
  fs.writeFileSync(path.join(machinaDir, 'rigor'), rigor + '\n', 'utf8');
  const state = readState(projectRoot);
  state.rigor = rigor;
  writeState(projectRoot, state);
}

function classifyWrite(filePath) {
  const norm = filePath.replace(/\\/g, '/');
  const base = path.basename(norm).toLowerCase();

  if (/\/specs\//.test(norm) && /security\.md$/i.test(norm)) return 'security';
  if (/\/specs\//.test(norm) && /spec\.md$/i.test(norm)) return 'spec';
  if (/\/specs\//.test(norm) && /plan\.md$/i.test(norm)) return 'spec';
  if (/\/specs\//.test(norm) && /tasks\.md$/i.test(norm)) return 'spec';
  if (base === 'security_spec.md') return 'security';
  if (base === 'constitution.md' && /\/specs?\//.test(norm)) return 'spec';

  if (TEST_PATTERNS.some((re) => re.test(norm))) return 'test';

  if (IMPL_PATTERNS.some((re) => re.test(norm))) return 'impl';

  if (/\.md$/i.test(norm)) return 'other';
  return 'other';
}

function taskSlug(state) {
  return (state.current_task || 'default').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 64);
}

function verifierDir(projectRoot, state) {
  return path.join(projectRoot, '.machina', 'verifiers', taskSlug(state));
}

function hasVerifierArtifact(projectRoot, state, name) {
  const fp = path.join(verifierDir(projectRoot, state), name);
  return fs.existsSync(fp) && fs.statSync(fp).size > 0;
}

function readVerifierExit(projectRoot, state, name) {
  const fp = path.join(verifierDir(projectRoot, state), name);
  if (!fs.existsSync(fp)) return null;
  const content = fs.readFileSync(fp, 'utf8');
  const m = content.match(/^exit:(-?\d+)/m);
  return m ? parseInt(m[1], 10) : null;
}

function hasSecuritySpec(projectRoot) {
  const rootSpec = path.join(projectRoot, 'SECURITY_SPEC.md');
  if (fs.existsSync(rootSpec)) {
    const c = fs.readFileSync(rootSpec, 'utf8');
    if (/##\s*Abuse cases/i.test(c)) return true;
  }
  const specsDir = path.join(projectRoot, 'specs');
  if (!fs.existsSync(specsDir)) return false;
  for (const ent of fs.readdirSync(specsDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const sec = path.join(specsDir, ent.name, 'security.md');
    if (fs.existsSync(sec)) {
      const c = fs.readFileSync(sec, 'utf8');
      if (/##\s*Abuse cases/i.test(c)) return true;
    }
  }
  return false;
}

function hasSpecMd(projectRoot) {
  const specsDir = path.join(projectRoot, 'specs');
  if (!fs.existsSync(specsDir)) return false;
  for (const ent of fs.readdirSync(specsDir, { withFileTypes: true })) {
    if (ent.isDirectory() && fs.existsSync(path.join(specsDir, ent.name, 'spec.md'))) return true;
    if (ent.isFile() && ent.name === 'spec.md') return true;
  }
  return fs.existsSync(path.join(projectRoot, 'specs', 'spec.md'));
}

function hasPlanMd(projectRoot) {
  const specsDir = path.join(projectRoot, 'specs');
  if (!fs.existsSync(specsDir)) return false;
  for (const ent of fs.readdirSync(specsDir, { withFileTypes: true })) {
    if (ent.isDirectory() && fs.existsSync(path.join(specsDir, ent.name, 'plan.md'))) return true;
  }
  return false;
}

function hasTasksMd(projectRoot) {
  const specsDir = path.join(projectRoot, 'specs');
  if (!fs.existsSync(specsDir)) return false;
  for (const ent of fs.readdirSync(specsDir, { withFileTypes: true })) {
    if (ent.isDirectory() && fs.existsSync(path.join(specsDir, ent.name, 'tasks.md'))) return true;
  }
  return false;
}

function projectUsesSpecKit(projectRoot) {
  return hasSpecMd(projectRoot) || fs.existsSync(path.join(projectRoot, 'specs'));
}

function allowedWrite(phase, rigor, fileClass, projectRoot, state) {
  if (rigor === 'ship') {
    if (fileClass === 'security' || fileClass === 'spec') return { ok: true };
    if ((fileClass === 'impl' || fileClass === 'test') && projectUsesSpecKit(projectRoot)) {
      if (!hasSecuritySpec(projectRoot)) {
        return {
          ok: false,
          reason:
            'Ship security floor: specs/ project requires security.md with ## Abuse cases before code changes.',
        };
      }
    }
    return { ok: true };
  }

  switch (phase) {
    case 'orient':
      if (fileClass === 'spec' || fileClass === 'security') return { ok: true };
      if (fileClass === 'test' || fileClass === 'impl') {
        return {
          ok: false,
          reason: 'Phase orient: set task and run /machina rigor or /machina next before writing code.',
        };
      }
      return { ok: true };

    case 'speckit_constitution':
    case 'speckit_specify':
      if (fileClass === 'spec') return { ok: true };
      if (fileClass === 'impl' || fileClass === 'test') {
        return { ok: false, reason: `Phase ${phase}: write spec-kit artifacts only. Run /speckit.specify first.` };
      }
      return { ok: true };

    case 'security_spec':
      if (fileClass === 'security' || fileClass === 'spec') return { ok: true };
      if (fileClass === 'impl' || fileClass === 'test') {
        if (!hasSecuritySpec(projectRoot)) {
          return {
            ok: false,
            reason:
              'Phase security_spec: create specs/<feature>/security.md with ## Abuse cases before implementation.',
          };
        }
        return {
          ok: false,
          reason: 'Phase security_spec: run /machina next to advance to speckit_plan before code.',
        };
      }
      return { ok: true };

    case 'speckit_plan':
      if (fileClass === 'spec') return { ok: true };
      if (fileClass === 'impl' || fileClass === 'test') {
        if (!hasPlanMd(projectRoot)) {
          return { ok: false, reason: 'Phase speckit_plan: write plan.md before code.' };
        }
        return {
          ok: false,
          reason: 'Phase speckit_plan: run /machina next to speckit_tasks before code.',
        };
      }
      return { ok: true };

    case 'speckit_tasks':
      if (fileClass === 'spec') return { ok: true };
      if (fileClass === 'impl' || fileClass === 'test') {
        if (!hasTasksMd(projectRoot)) {
          return { ok: false, reason: 'Phase speckit_tasks: write tasks.md before code.' };
        }
        return {
          ok: false,
          reason: 'Phase speckit_tasks: run /machina next to red phase before code.',
        };
      }
      return { ok: true };

    case 'red':
      if (fileClass === 'test') return { ok: true };
      if (fileClass === 'spec' || fileClass === 'security') return { ok: true };
      if (fileClass === 'impl') {
        return {
          ok: false,
          reason: 'Phase red: write failing tests only. Impl files blocked until RED verifier artifact exists.',
        };
      }
      return { ok: true };

    case 'green':
      if (fileClass === 'test' || fileClass === 'spec' || fileClass === 'security') return { ok: true };
      if (fileClass === 'impl') {
        const redExit = readVerifierExit(projectRoot, state, 'red.txt');
        if (redExit === null) {
          return {
            ok: false,
            reason: 'Phase green: run tests first — missing .machina/verifiers/<task>/red.txt with exit≠0.',
          };
        }
        if (redExit === 0) {
          return {
            ok: false,
            reason: 'Phase green: RED artifact shows exit:0 — tests must fail before implementation.',
          };
        }
        return { ok: true };
      }
      return { ok: true };

    case 'refactor':
    case 'ci_gates':
    case 'ux_gate':
    case 'task_complete':
      return { ok: true };

    default:
      return { ok: true };
  }
}

function appendTelemetry(projectRoot, event) {
  try {
    const fp = path.join(projectRoot, '.machina', 'telemetry.jsonl');
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    const line = JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n';
    fs.appendFileSync(fp, line, 'utf8');
  } catch (_) {}
}

function sessionId() {
  const crypto = require('crypto');
  return (
    process.env.CLAUDE_SESSION_ID ||
    crypto.createHash('md5').update(String(process.ppid)).digest('hex').slice(0, 8)
  );
}

function harnessContext(projectRoot) {
  const state = readState(projectRoot);
  const lines = [
    `MACHINA v3.1 | rigor=${state.rigor} | phase=${state.phase} | task=${state.current_task || 'none'} | pass=${state.pass_count}/5`,
    state.rigor === 'rigor'
      ? 'Rigor: full loop (spec → RED → GREEN → CI → UX). Impl blocked in red phase.'
      : 'Ship: surgical edits + security floors only. Use /machina rigor for full loop.',
    'Commands: /machina status | rigor | ship | next | reset | rules',
    'State: .machina/state.json | Verifiers: .machina/verifiers/<task>/',
  ];
  return lines.join('\n');
}

module.exports = {
  PHASES,
  findProjectRoot,
  defaultState,
  readState,
  writeState,
  setRigor,
  readRigor,
  readProfile,
  classifyWrite,
  taskSlug,
  verifierDir,
  hasVerifierArtifact,
  readVerifierExit,
  hasSecuritySpec,
  hasSpecMd,
  hasPlanMd,
  hasTasksMd,
  allowedWrite,
  appendTelemetry,
  sessionId,
  harnessContext,
};
