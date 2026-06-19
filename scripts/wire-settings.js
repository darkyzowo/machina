#!/usr/bin/env node
// wire-settings.js — idempotent Machina v3.1 hook wiring for ~/.claude/settings.json
const fs = require('fs');
const path = require('path');

const home = process.env.HOME || process.env.USERPROFILE;
const settingsPath = path.join(home, '.claude', 'settings.json');
const hooksDir = path.join(home, '.claude', 'hooks');
const hook = (file) => `node "${hooksDir.replace(/\\/g, '/')}/${file}"`;

const LEGACY_MACHINA = [
  'mode-init.js',
  'done-signal-guard.js',
];

const V3_HOOKS = {
  session: 'harness-init.js',
  preTool: ['secret-guard.js', 'phase-gate.js', 'pass-ceiling.js'],
  postBash: 'verifier-capture.js',
};

function isLegacyMachina(cmd) {
  if (!cmd || typeof cmd !== 'string') return false;
  return LEGACY_MACHINA.some((h) => cmd.includes(h));
}

function isV3Machina(cmd) {
  if (!cmd || typeof cmd !== 'string') return false;
  return (
    cmd.includes('harness-init') ||
    cmd.includes('secret-guard') ||
    cmd.includes('phase-gate') ||
    cmd.includes('pass-ceiling.js') ||
    cmd.includes('verifier-capture')
  );
}

function stripLegacy(groups) {
  if (!Array.isArray(groups)) return [];
  return groups
    .map((g) => ({
      ...g,
      hooks: (g.hooks || []).filter((h) => !isLegacyMachina(h.command)),
    }))
    .filter((g) => (g.hooks || []).length > 0);
}

function hasHook(groups, needle) {
  return (groups || []).some((g) =>
    (g.hooks || []).some((h) => h.command && h.command.includes(needle))
  );
}

function main() {
  if (!fs.existsSync(settingsPath)) {
    console.error('settings.json not found at', settingsPath);
    console.error('Launch Claude Code once, then re-run migrate-v3.sh');
    process.exit(1);
  }

  const s = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  if (!s.hooks) s.hooks = {};

  // Strip v2.5 Machina from all hook events
  for (const key of Object.keys(s.hooks)) {
    s.hooks[key] = stripLegacy(s.hooks[key]);
  }

  // Remove v2 pass-ceiling-only groups (replaced by v3 bundle)
  s.hooks.PreToolUse = (s.hooks.PreToolUse || []).filter((g) => {
    const cmds = (g.hooks || []).map((h) => h.command || '').join(' ');
    if (cmds.includes('pass-ceiling') && !cmds.includes('phase-gate')) return false;
    return true;
  });

  // SessionStart: harness-init (keep non-Machina hooks like caveman)
  if (!hasHook(s.hooks.SessionStart, 'harness-init')) {
    s.hooks.SessionStart = s.hooks.SessionStart || [];
    s.hooks.SessionStart.push({
      hooks: [{ type: 'command', command: hook(V3_HOOKS.session), timeout: 10 }],
    });
    console.log('  + SessionStart: harness-init.js');
  }

  // PreToolUse: single matcher group, three hooks in order
  s.hooks.PreToolUse = (s.hooks.PreToolUse || []).filter(
    (g) => !(g.matcher && g.matcher.includes('Edit') && (g.hooks || []).some((h) => isV3Machina(h.command)))
  );
  s.hooks.PreToolUse.push({
    matcher: 'Edit|Write',
    hooks: V3_HOOKS.preTool.map((f) => ({
      type: 'command',
      command: hook(f),
      timeout: 5,
    })),
  });
  console.log('  + PreToolUse: secret-guard → phase-gate → pass-ceiling');

  // PostToolUse Bash: verifier capture (success)
  if (!hasHook(s.hooks.PostToolUse, 'verifier-capture')) {
    s.hooks.PostToolUse = s.hooks.PostToolUse || [];
    s.hooks.PostToolUse.push({
      matcher: 'Bash',
      hooks: [{ type: 'command', command: hook(V3_HOOKS.postBash), timeout: 15 }],
    });
    console.log('  + PostToolUse Bash: verifier-capture.js');
  }

  // PostToolUseFailure Bash: verifier capture (failing tests = RED)
  if (!s.hooks.PostToolUseFailure) s.hooks.PostToolUseFailure = [];
  s.hooks.PostToolUseFailure = s.hooks.PostToolUseFailure.filter(
    (g) => !(g.matcher && g.matcher.includes('Bash') && (g.hooks || []).some((h) => isV3Machina(h.command)))
  );
  s.hooks.PostToolUseFailure.push({
    matcher: 'Bash',
    hooks: [{ type: 'command', command: hook(V3_HOOKS.postBash), timeout: 15 }],
  });
  console.log('  + PostToolUseFailure Bash: verifier-capture.js');

  // statusLine: Machina quiet HUD (preserve prior in backup; set MACHINA_KEEP_STATUSLINE=1 to skip)
  if (process.env.MACHINA_KEEP_STATUSLINE !== '1') {
    s.statusLine = {
      type: 'command',
      command: `bash "${path.join(home, '.claude', 'statusline.sh').replace(/\\/g, '/')}"`,
    };
    console.log('  + statusLine: machina statusline.sh');
  }

  fs.writeFileSync(settingsPath, JSON.stringify(s, null, 2) + '\n', 'utf8');
  console.log('  ✓ settings.json updated');
}

main();
