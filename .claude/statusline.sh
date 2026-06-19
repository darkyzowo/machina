#!/usr/bin/env bash
# machina statusline v3 — quiet one-liner (phase + rigor + pass count)
# No git subprocess, no multi-node JSON parse.

input=$(cat 2>/dev/null || echo '{}')

node -e "
const fs = require('fs');
const path = require('path');
const os = require('os');

let payload = {};
try { payload = JSON.parse(process.argv[1] || '{}'); } catch (_) {}

const cwd = payload.workspace?.current_dir || payload.workspace?.project_dir || payload.cwd || process.cwd();

function findRoot(start) {
  let dir = path.resolve(start);
  for (let i = 0; i < 25; i++) {
    if (fs.existsSync(path.join(dir, '.machina'))) return dir;
    const p = path.dirname(dir);
    if (p === dir) break;
    dir = p;
  }
  return null;
}

const root = findRoot(cwd);
let rigor = '—';
let phase = '—';
let pass = '—';

if (root) {
  try {
    const state = JSON.parse(fs.readFileSync(path.join(root, '.machina', 'state.json'), 'utf8'));
    rigor = state.rigor || 'ship';
    phase = state.phase || 'orient';
    pass = (state.pass_count || 0) + '/5';
  } catch (_) {}
  try {
    const r = fs.readFileSync(path.join(root, '.machina', 'rigor'), 'utf8').trim();
    if (r) rigor = r;
  } catch (_) {}
}

const model = payload.model?.display_name || '';
const parts = ['MACHINA', rigor, phase, 'pass:' + pass];
if (model) parts.push(model);
process.stdout.write(parts.join(' | '));
" "$input" 2>/dev/null || echo "MACHINA"
