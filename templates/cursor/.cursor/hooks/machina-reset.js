#!/usr/bin/env node
// machina-reset.js — Clear pass-ceiling counters after human review.
// Cursor equivalent of /machina-reset slash command.

const fs = require('fs');
const path = require('path');

if (process.env.CURSOR_VERSION || process.env.CURSOR_PLUGIN_ROOT) process.exit(0);

function findProjectRoot(start) {
  let dir = path.resolve(start || process.cwd());
  for (let i = 0; i < 25; i++) {
    if (
      fs.existsSync(path.join(dir, '.machina')) ||
      fs.existsSync(path.join(dir, '.agent-profile')) ||
      fs.existsSync(path.join(dir, 'AGENTS.md'))
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
const countsDir = path.join(projectRoot, '.machina', 'pass-counts');
const stateFile = path.join(projectRoot, '.machina', 'state.json');

let removed = 0;
if (fs.existsSync(countsDir)) {
  for (const f of fs.readdirSync(countsDir)) {
    try {
      fs.unlinkSync(path.join(countsDir, f));
      removed += 1;
    } catch (_) {}
  }
}

if (fs.existsSync(stateFile)) {
  try {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    state.pass_count = 0;
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n', 'utf8');
  } catch (_) {}
}

console.log(`Machina pass ceiling reset. Cleared ${removed} counter file(s) in .machina/pass-counts/`);
