#!/usr/bin/env node
// machina-session-init.js — Cursor sessionStart hook
// Injects active profile + phase reminder (port of mode-init.js semantics).

const fs = require('fs');
const path = require('path');

function findProjectRoot(start) {
  let dir = path.resolve(start || process.cwd());
  for (let i = 0; i < 25; i++) {
    if (
      fs.existsSync(path.join(dir, '.agent-profile')) ||
      fs.existsSync(path.join(dir, 'AGENTS.md')) ||
      fs.existsSync(path.join(dir, '.cursor', 'rules', 'machina-integration.mdc'))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(start || process.cwd());
}

const projectRoot = findProjectRoot(process.cwd());
let profile = 'lean';

try {
  const raw = fs
    .readFileSync(path.join(projectRoot, '.agent-profile'), 'utf8')
    .trim()
    .toLowerCase();
  if (['lean', 'standard', 'full'].includes(raw)) profile = raw;
} catch (_) {
  /* default lean */
}

const machinaDir = path.join(projectRoot, '.machina');
const stateFile = path.join(machinaDir, 'state.json');

try {
  fs.mkdirSync(machinaDir, { recursive: true });
  if (!fs.existsSync(stateFile)) {
    fs.writeFileSync(
      stateFile,
      JSON.stringify(
        {
          phase: 'orient',
          current_task: null,
          pass_count: 0,
          ux_gate: 'pending',
          profile,
        },
        null,
        2
      ) + '\n',
      'utf8'
    );
  }
} catch (_) {}

const sections = {
  lean: '§0–§4',
  standard: '§0–§5',
  full: '§0–§6',
};

const context =
  `MACHINA PROJECT MODE [${profile}] — active sections ${sections[profile] || sections.lean}.\n` +
  `State: .machina/state.json | Tasks: specs/**/tasks.md (spec-kit, not SPEC.md).\n` +
  `RED gate: one phase per turn. Pass ceiling: 5 Write/StrReplace edits.`;

process.stdout.write(JSON.stringify({ additional_context: context }));
