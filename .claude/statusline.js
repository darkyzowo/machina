#!/usr/bin/env node
// statusline.js — Machina v3.1 HUD (quiet + core session metrics from Claude Code stdin JSON)

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function readStdin() {
  if (process.stdin.isTTY) return {};
  try {
    const raw = fs.readFileSync(0, 'utf8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

function findMachinaRoot(start) {
  let dir = path.resolve(start || process.cwd());
  for (let i = 0; i < 25; i++) {
    if (fs.existsSync(path.join(dir, '.machina'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function readMachinaState(root) {
  const out = { rigor: '—', phase: '—', pass: '—' };
  if (!root) return out;
  try {
    const state = JSON.parse(fs.readFileSync(path.join(root, '.machina', 'state.json'), 'utf8'));
    out.rigor = state.rigor || 'ship';
    out.phase = state.phase || 'orient';
    out.pass = `${state.pass_count || 0}/5`;
  } catch (_) {}
  try {
    const r = fs.readFileSync(path.join(root, '.machina', 'rigor'), 'utf8').trim();
    if (r) out.rigor = r;
  } catch (_) {}
  return out;
}

function getTotalTokens(usage) {
  if (!usage) return 0;
  return (
    (usage.input_tokens || 0) +
    (usage.cache_creation_input_tokens || 0) +
    (usage.cache_read_input_tokens || 0)
  );
}

function getContextPercent(payload) {
  const cw = payload.context_window || {};
  const native = cw.used_percentage;
  if (typeof native === 'number' && !Number.isNaN(native) && native > 0) {
    return Math.min(100, Math.max(0, Math.round(native)));
  }
  const size = cw.context_window_size;
  if (!size || size <= 0) return 0;
  return Math.min(100, Math.round((getTotalTokens(cw.current_usage) / size) * 100));
}

function contextBar(percent, width = 10) {
  const filled = Math.min(width, Math.max(0, Math.round((percent / 100) * width)));
  return '[' + '#'.repeat(filled) + '-'.repeat(width - filled) + ']';
}

function formatTokens(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k';
  return String(n);
}

function shortModel(payload) {
  const name = payload.model?.display_name || payload.model?.id || '';
  if (!name) return '';
  return name.replace(/\s*\([^)]*context[^)]*\)/i, '').replace(/^Claude\s+/i, '').trim();
}

function gitBranch(repoDir) {
  if (!repoDir) return '';
  const r = spawnSync('git', ['-C', repoDir, '--no-optional-locks', 'symbolic-ref', '--short', 'HEAD'], {
    encoding: 'utf8',
    timeout: 800,
  });
  if (r.status === 0 && r.stdout) return r.stdout.trim();
  const r2 = spawnSync('git', ['-C', repoDir, '--no-optional-locks', 'rev-parse', '--short', 'HEAD'], {
    encoding: 'utf8',
    timeout: 800,
  });
  return r2.status === 0 && r2.stdout ? r2.stdout.trim() : '';
}

function gitDirty(repoDir) {
  if (!repoDir) return false;
  const r = spawnSync('git', ['-C', repoDir, '--no-optional-locks', 'status', '--porcelain'], {
    encoding: 'utf8',
    timeout: 800,
  });
  return r.status === 0 && Boolean(r.stdout && r.stdout.trim());
}

function rateLimitParts(payload) {
  const rl = payload.rate_limits || {};
  const parts = [];
  const five = rl.five_hour?.used_percentage;
  const seven = rl.seven_day?.used_percentage;
  if (typeof five === 'number' && Number.isFinite(five)) parts.push(`5h:${Math.round(five)}%`);
  if (typeof seven === 'number' && Number.isFinite(seven)) parts.push(`7d:${Math.round(seven)}%`);
  return parts;
}

function cavemanBadge() {
  const flag = path.join(require('os').homedir(), '.claude', '.caveman-active');
  try {
    if (!fs.existsSync(flag)) return '';
    const mode = fs.readFileSync(flag, 'utf8').trim();
    return mode ? `[CAV:${mode.toUpperCase()}]` : '[CAV]';
  } catch (_) {
    return '';
  }
}

function main() {
  const payload = readStdin();
  const cwd =
    payload.workspace?.current_dir ||
    payload.workspace?.project_dir ||
    payload.cwd ||
    process.cwd();
  const projectDir = payload.workspace?.project_dir || cwd;
  const projectName = path.basename(projectDir || cwd) || 'project';

  const machinaRoot = findMachinaRoot(cwd);
  const m = readMachinaState(machinaRoot);

  const ctx = payload.context_window || {};
  const pct = getContextPercent(payload);
  const totalTok = getTotalTokens(ctx.current_usage);
  const ctxSize = ctx.context_window_size || 0;
  const remaining = ctx.remaining_percentage;

  const branch = gitBranch(projectDir);
  const dirty = gitDirty(projectDir);
  const branchDisp = branch ? (dirty ? `${branch}*` : branch) : '';

  const parts = [];

  const cav = cavemanBadge();
  if (cav) parts.push(cav);

  parts.push(`MACHINA ${m.rigor} ${m.phase} pass:${m.pass}`);

  const loc = branchDisp ? `${projectName} (${branchDisp})` : projectName;
  parts.push(loc);

  if (pct > 0 || totalTok > 0) {
    let ctxPart = `${contextBar(pct)} ${pct}%`;
    if (totalTok > 0 && ctxSize > 0) {
      ctxPart += ` ${formatTokens(totalTok)}/${formatTokens(ctxSize)}`;
    } else if (totalTok > 0) {
      ctxPart += ` ${formatTokens(totalTok)} tok`;
    }
    if (typeof remaining === 'number' && Number.isFinite(remaining)) {
      ctxPart += ` rem:${Math.round(remaining)}%`;
    }
    parts.push(ctxPart);
  }

  const model = shortModel(payload);
  if (model) parts.push(model);

  const limits = rateLimitParts(payload);
  if (limits.length) parts.push(limits.join(' '));

  process.stdout.write(parts.join(' | '));
}

main();
