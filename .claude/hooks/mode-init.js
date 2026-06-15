#!/usr/bin/env node
// mode-init.js — Machina session mode detection + conditional rules injection
// Runs as a SessionStart hook.
//
// Priority: mode.txt (explicit override) > .agent-profile (project auto-detect) > casual
//
// Project mode → injects rules.md sections filtered by .agent-profile tier
// Casual mode  → injects lean 3-line summary (saves ~1,766 tokens vs static @-import)

const fs = require('fs');
const path = require('path');
const os = require('os');

const homeDir = os.homedir();
const modeTxtPath = path.join(homeDir, '.claude', 'mode.txt');
const currentModePath = path.join(homeDir, '.claude', 'current-mode.txt');
const currentProfilePath = path.join(homeDir, '.claude', 'current-profile.txt');
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

// Persist active mode for other hooks/tools
try { fs.writeFileSync(currentModePath, mode, 'utf8'); } catch (e) {}

if (mode === 'project') {
  // Determine profile tier — default lean when .agent-profile absent (CLAUDE.md-only path)
  let profile = 'lean';
  try {
    const raw = fs.readFileSync(path.join(projectCwd, '.agent-profile'), 'utf8').trim().toLowerCase();
    if (['lean', 'standard', 'full'].includes(raw)) profile = raw;
  } catch (e) { /* absent → lean */ }

  // Persist active profile for other hooks/tools
  try { fs.writeFileSync(currentProfilePath, profile, 'utf8'); } catch (e) {}

  // Load and filter rules by profile
  let rulesContent = '';
  try {
    rulesContent = fs.readFileSync(rulesPath, 'utf8');
  } catch (e) {
    process.stdout.write(
      `## MACHINA — PROJECT MODE ACTIVE [${profile}]\n\n` +
      `[machina] WARNING: rules.md not found at ${rulesPath}. Re-run global-setup.sh to restore.`
    );
    process.exit(0);
  }

  process.stdout.write(
    `## MACHINA — PROJECT MODE ACTIVE [${profile}]\n\n` +
    filterRules(rulesContent, profile)
  );
} else {
  process.stdout.write(
    '## MACHINA — CASUAL MODE ACTIVE\n\n' +
    'Lean ruleset only. Active: §4 surgical changes (scope changes only, no reformatting, no over-engineering).\n' +
    'Suspended: §1.3 scaffold hygiene, §2 TDD, §3 UX gate, §5 pre-merge checklist.\n' +
    'RTK + Caveman ultra remain active. Switch to project rules mid-session: /project'
  );
}

// Filter rules.md sections by profile tier.
// §0 always included — it contains the pass ceiling and done-signal rules.
// Sections delineated by "## §N" headers; content between boundaries sliced exactly.
function filterRules(content, profile) {
  const profileSections = {
    lean:     ['§0', '§1', '§2', '§3', '§4'],
    standard: ['§0', '§1', '§2', '§3', '§4', '§5'],
    full:     ['§0', '§1', '§2', '§3', '§4', '§5', '§6'],
  };
  const include = new Set(profileSections[profile] || profileSections.lean);

  // Locate all ## §N section boundaries
  const sectionRegex = /^## (§\d+)/mg;
  const boundaries = [];
  let m;
  while ((m = sectionRegex.exec(content)) !== null) {
    boundaries.push({ pos: m.index, key: m[1] });
  }
  if (boundaries.length === 0) return content;

  const preamble = content.slice(0, boundaries[0].pos).trimEnd();
  const chunks = [];
  for (let i = 0; i < boundaries.length; i++) {
    if (!include.has(boundaries[i].key)) continue;
    const start = boundaries[i].pos;
    const end = i + 1 < boundaries.length ? boundaries[i + 1].pos : content.length;
    chunks.push(content.slice(start, end));
  }

  return (preamble ? preamble + '\n\n' : '') + chunks.join('').trimEnd();
}
