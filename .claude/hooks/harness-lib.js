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

const UI_FILE_PATTERNS = [
  /\.[cm]?[jt]sx$/i,
  /\.vue$/i,
  /\.svelte$/i,
  /\.css$/i,
  /\.scss$/i,
  /\.less$/i,
  /\/components\//i,
  /\/app\/.*\/page\.[cm]?[jt]sx?$/i,
  /\/pages\//i,
  /\/views\//i,
  /\/layouts?\//i,
];

const SECURITY_SENSITIVE_PATTERNS = [
  /\/api\//i,
  /\/auth\//i,
  /\/middleware\.[cm]?[jt]s$/i,
  /\/routes?\//i,
  /\/lib\/auth\//i,
  /\/server\//i,
  /security/i,
  /\/handlers?\//i,
  /\/controllers?\//i,
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
    ux_skip_reason: null,
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

function isUiFile(filePath) {
  const norm = filePath.replace(/\\/g, '/');
  return UI_FILE_PATTERNS.some((re) => re.test(norm));
}

function isSecuritySensitivePath(filePath) {
  const norm = filePath.replace(/\\/g, '/');
  return SECURITY_SENSITIVE_PATTERNS.some((re) => re.test(norm));
}

function needsSecuritySpec(projectRoot, filePath) {
  return projectUsesSpecKit(projectRoot) || isSecuritySensitivePath(filePath);
}

function ciGatePassed(projectRoot, state) {
  const exit = readVerifierExit(projectRoot, state, 'ci.txt');
  return exit !== null && exit === 0;
}

function uxGatePassed(state, projectRoot) {
  if (!state.ui_touched) return true;
  if (state.ux_gate === 'skipped') return Boolean(state.ux_skip_reason);
  const exit = readVerifierExit(projectRoot, state, 'ux.txt');
  return exit !== null && exit === 0;
}

function markUiTouched(projectRoot, state) {
  if (state.ui_touched) return state;
  state.ui_touched = true;
  state.ux_gate = 'pending';
  writeState(projectRoot, state);
  appendTelemetry(projectRoot, { event: 'ui_touched', task: state.current_task });
  return state;
}

function skipUxGate(projectRoot, state, reason) {
  if (!reason || !String(reason).trim()) {
    return { ok: false, reason: 'UX skip requires a non-empty reason string.' };
  }
  state.ux_gate = 'skipped';
  state.ux_skip_reason = String(reason).trim().slice(0, 240);
  writeState(projectRoot, state);
  appendTelemetry(projectRoot, { event: 'ux_skipped', reason: state.ux_skip_reason });
  return { ok: true, phase: state.phase, message: `UX gate SKIPPED: ${state.ux_skip_reason}` };
}

function advancePhase(projectRoot, state, options = {}) {
  if (state.rigor === 'ship') {
    return { ok: false, reason: 'Ship mode has no phase machine. Use /machina rigor for the full loop.' };
  }

  const phase = state.phase;
  let next = null;
  let note = '';

  switch (phase) {
    case 'orient':
      next = hasSpecMd(projectRoot) ? 'security_spec' : 'speckit_specify';
      if (!state.current_task && hasTasksMd(projectRoot)) {
        note = 'Set current_task from specs/**/tasks.md before red phase.';
      }
      break;

    case 'speckit_constitution':
    case 'speckit_specify':
      if (!hasSpecMd(projectRoot)) {
        return { ok: false, reason: 'Missing specs/**/spec.md — run /speckit.specify first.' };
      }
      next = 'security_spec';
      break;

    case 'security_spec':
      if (!hasSecuritySpec(projectRoot)) {
        return {
          ok: false,
          reason: 'Missing security spec with ## Abuse cases — run /security-spec first.',
        };
      }
      next = hasPlanMd(projectRoot) ? 'speckit_tasks' : 'speckit_plan';
      break;

    case 'speckit_plan':
      if (!hasPlanMd(projectRoot)) {
        return { ok: false, reason: 'Missing specs/**/plan.md — run /speckit.plan first.' };
      }
      next = 'speckit_tasks';
      break;

    case 'speckit_tasks':
      if (!hasTasksMd(projectRoot)) {
        return { ok: false, reason: 'Missing specs/**/tasks.md — run /speckit.tasks first.' };
      }
      next = 'red';
      break;

    case 'red': {
      const redExit = readVerifierExit(projectRoot, state, 'red.txt');
      if (redExit === null) {
        return {
          ok: false,
          reason: 'RED gate open: run failing tests (npm test / pytest) to capture red.txt with exit≠0.',
        };
      }
      if (redExit === 0) {
        return { ok: false, reason: 'RED artifact shows exit:0 — tests must fail before advancing.' };
      }
      next = 'green';
      break;
    }

    case 'green': {
      const greenExit = readVerifierExit(projectRoot, state, 'green.txt');
      if (greenExit === null) {
        return {
          ok: false,
          reason: 'GREEN gate open: run passing tests to capture green.txt with exit=0.',
        };
      }
      if (greenExit !== 0) {
        return { ok: false, reason: `GREEN artifact shows exit:${greenExit} — tests must pass before advancing.` };
      }
      next = 'refactor';
      break;
    }

    case 'refactor':
      next = 'ci_gates';
      note = 'Run CI (npm run lint && npm run typecheck && npm test && npm run build) before ux/task_complete.';
      break;

    case 'ci_gates':
      if (!ciGatePassed(projectRoot, state)) {
        return {
          ok: false,
          reason:
            'CI gate open: run lint/typecheck/build (or npm test) — need .machina/verifiers/<task>/ci.txt with exit=0.',
        };
      }
      if (state.ui_touched) {
        next = 'ux_gate';
        note = 'UI touched — run /machina ux (agent-browser or Playwright) or /machina next --skip-ux "reason".';
      } else {
        next = 'task_complete';
        state.ux_gate = 'skipped';
        state.ux_skip_reason = 'no_ui_surface';
      }
      break;

    case 'ux_gate':
      if (options.skipUx) {
        return skipUxGate(projectRoot, state, options.skipUx);
      }
      if (!state.ui_touched) {
        next = 'task_complete';
        break;
      }
      if (state.ux_gate === 'skipped' && state.ux_skip_reason) {
        next = 'task_complete';
        break;
      }
      if (!uxGatePassed(state, projectRoot)) {
        return {
          ok: false,
          reason:
            'UX gate open: capture ux.txt via agent-browser/Playwright, or /machina next --skip-ux "reason" (SKIPPED ≠ PASSED).',
        };
      }
      next = 'task_complete';
      state.ux_gate = 'passed';
      break;

    case 'task_complete':
      next = 'orient';
      state.current_task = null;
      state.ui_touched = false;
      state.ux_gate = 'pending';
      state.ux_skip_reason = null;
      state.security_spec = 'pending';
      note = 'Task complete — set next current_task and /machina next or /machina rigor.';
      break;

    default:
      return { ok: false, reason: `Unknown phase: ${phase}` };
  }

  if (!next) {
    return { ok: false, reason: `Cannot advance from phase ${phase}.` };
  }

  const prev = state.phase;
  state.phase = next;
  writeState(projectRoot, state);
  appendTelemetry(projectRoot, { event: 'phase_exit', phase: prev, outcome: 'advance' });
  appendTelemetry(projectRoot, { event: 'phase_enter', phase: next });

  return {
    ok: true,
    from: prev,
    to: next,
    message: `Advanced ${prev} → ${next}${note ? `. ${note}` : ''}`,
  };
}

function allowedWrite(phase, rigor, fileClass, projectRoot, state, filePath) {
  if (rigor === 'ship') {
    if (fileClass === 'security' || fileClass === 'spec') return { ok: true };
    if ((fileClass === 'impl' || fileClass === 'test') && filePath && needsSecuritySpec(projectRoot, filePath)) {
      if (!hasSecuritySpec(projectRoot)) {
        return {
          ok: false,
          reason:
            'Ship security floor: security-sensitive path or specs/ project requires security.md with ## Abuse cases. Run /security-spec.',
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
      if (fileClass === 'impl' || fileClass === 'test') return { ok: true };
      return { ok: true };

    case 'ci_gates':
      if (fileClass === 'spec' || fileClass === 'security' || fileClass === 'other') return { ok: true };
      if (fileClass === 'impl' || fileClass === 'test') {
        if (!ciGatePassed(projectRoot, state)) {
          return {
            ok: false,
            reason:
              'Phase ci_gates: run lint/typecheck/build/test — need ci.txt with exit=0 before more code changes.',
          };
        }
        return { ok: true };
      }
      return { ok: true };

    case 'ux_gate':
      if (fileClass === 'spec' || fileClass === 'security' || fileClass === 'other') return { ok: true };
      if (fileClass === 'impl' || fileClass === 'test') {
        if (!state.ui_touched) return { ok: true };
        if (state.ux_gate === 'skipped' && state.ux_skip_reason) return { ok: true };
        if (!uxGatePassed(state, projectRoot)) {
          return {
            ok: false,
            reason:
              'Phase ux_gate: UI work requires ux.txt evidence (agent-browser/Playwright) or logged SKIPPED via /machina next --skip-ux.',
          };
        }
        return { ok: true };
      }
      return { ok: true };

    case 'task_complete':
      if (fileClass === 'impl' || fileClass === 'test') {
        return {
          ok: false,
          reason: 'Phase task_complete: run /machina next to return to orient before new implementation.',
        };
      }
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
    `MACHINA v3.2 | rigor=${state.rigor} | phase=${state.phase} | task=${state.current_task || 'none'} | pass=${state.pass_count}/5${state.ui_touched ? ' | ui' : ''}`,
    state.rigor === 'rigor'
      ? 'Rigor: spec → security → RED → GREEN → CI → UX. Use /machina next (mechanical advance).'
      : 'Ship: surgical edits + security floors on sensitive paths. Use /machina rigor for full loop.',
    'Commands: /machina status | next | rigor | ship | ux | reset | rules',
    'State: .machina/state.json | Verifiers: .machina/verifiers/<task>/',
  ];
  if (state.rigor === 'rigor' && state.ui_touched && state.phase === 'ux_gate') {
    lines.push('UX: /machina ux — agent-browser + ui-ux-pro-max skill before shipping UI.');
  }
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
  projectUsesSpecKit,
  isUiFile,
  isSecuritySensitivePath,
  needsSecuritySpec,
  ciGatePassed,
  uxGatePassed,
  markUiTouched,
  skipUxGate,
  advancePhase,
  allowedWrite,
  appendTelemetry,
  sessionId,
  harnessContext,
};
