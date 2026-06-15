#!/usr/bin/env node
// mode-init.js — Machina session mode detection + conditional rules injection
// Runs as a SessionStart hook.
//
// Priority: mode.txt (explicit override) > .agent-profile (project auto-detect) > casual
//
// Project mode → injects full rules.md into session context
// Casual mode  → injects lean 3-line summary (saves ~1,766 tokens vs static @-import)

const fs = require('fs');
const path = require('path');
const os = require('os');

const homeDir = os.homedir();
const modeTxtPath = path.join(homeDir, '.claude', 'mode.txt');
const currentModePath = path.join(homeDir, '.claude', 'current-mode.txt');
const rulesPath = path.join(homeDir, '.claude', 'machina', 'rules.md');

// Read cwd from SessionStart payload (stdin JSON).
// Only read stdin when it is piped (hook context). Skip when interactive terminal
// so that standalone test runs (`node mode-init.js`) don't block waiting for input.
let projectCwd = process.cwd();
if (!process.stdin.isTTY) {
  try {
    const raw = fs.readFileSync(0, 'utf8').trim();
    if (raw) {
      const payload = JSON.parse(raw);
      projectCwd = payload.cwd || payload.working_directory || process.cwd();
    }
  } catch (e) {
    // Proceed with process.cwd() — non-fatal
  }
}

// Detect mode
let mode;
try {
  const stored = fs.readFileSync(modeTxtPath, 'utf8').trim();
  if (stored === 'project' || stored === 'casual') {
    mode = stored; // Explicit user override wins
  }
} catch (e) {
  // mode.txt absent — fall through to auto-detect
}

if (!mode) {
  const hasAgentProfile = fs.existsSync(path.join(projectCwd, '.agent-profile'));
  const hasClaudeMd = fs.existsSync(path.join(projectCwd, 'CLAUDE.md'));
  mode = (hasAgentProfile || hasClaudeMd) ? 'project' : 'casual';
}

// Write current-mode.txt so other hooks/tools can read active mode
try {
  fs.writeFileSync(currentModePath, mode, 'utf8');
} catch (e) {}

if (mode === 'project') {
  let rules = '';
  try {
    rules = fs.readFileSync(rulesPath, 'utf8');
  } catch (e) {
    rules = `[machina] WARNING: rules.md not found at ${rulesPath}. Re-run global-setup.sh to restore.`;
  }
  process.stdout.write(`## MACHINA — PROJECT MODE ACTIVE\n\n${rules}`);
} else {
  process.stdout.write(
    '## MACHINA — CASUAL MODE ACTIVE\n\n' +
    'Lean ruleset only. Active: §4 surgical changes (scope changes only, no reformatting, no over-engineering).\n' +
    'Suspended: §1.3 scaffold hygiene, §2 TDD, §3 UX gate, §5 pre-merge checklist.\n' +
    'RTK + Caveman ultra remain active. Switch to project rules mid-session: /project'
  );
}
