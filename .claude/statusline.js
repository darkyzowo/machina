#!/usr/bin/env node
// statusline.js — Machina v3.2 HUD (Machina state + claude-hud-style visuals)

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const ORANGE = '\x1b[38;5;208m';
const BLUE = '\x1b[94m';
const MAGENTA_BRIGHT = '\x1b[95m';

function c(color, text) {
  return `${color}${text}${RESET}`;
}

async function readStdin() {
  if (process.stdin.isTTY) return {};
  return new Promise((resolve) => {
    let raw = '';
    let sawData = false;
    let settled = false;
    let idleTimer;
    let firstByteTimer;

    const cleanup = () => {
      clearTimeout(firstByteTimer);
      clearTimeout(idleTimer);
      process.stdin.off('data', onData);
      process.stdin.off('end', onEnd);
      process.stdin.off('error', onError);
      process.stdin.pause();
    };

    const finish = (value) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value ?? {});
    };

    const tryParse = () => {
      const trimmed = raw.trim();
      if (!trimmed) return null;
      try {
        return JSON.parse(trimmed);
      } catch {
        return undefined;
      }
    };

    const onData = (chunk) => {
      sawData = true;
      clearTimeout(firstByteTimer);
      raw += String(chunk);
      const parsed = tryParse();
      if (parsed !== undefined) {
        finish(parsed);
        return;
      }
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => finish(tryParse() ?? {}), 30);
    };

    const onEnd = () => finish(tryParse() ?? {});
    const onError = () => finish({});

    try {
      process.stdin.setEncoding('utf8');
    } catch {
      finish({});
      return;
    }

    firstByteTimer = setTimeout(() => {
      if (!sawData) finish({});
    }, 250);

    process.stdin.on('data', onData);
    process.stdin.on('end', onEnd);
    process.stdin.on('error', onError);
    process.stdin.resume();
  });
}

function findMachinaRoot(start) {
  try {
    const { resolveHarnessRoot } = require('./harness-lib');
    const { root, tier, machinaDir } = resolveHarnessRoot(start);
    if (tier === 'project' || fs.existsSync(machinaDir)) return root;
  } catch (_) {}
  return null;
}

function readMachinaState(root) {
  const out = { rigor: '—', phase: '—', pass: '—', tier: 'global' };
  if (!root) return out;
  try {
    const { resolveHarnessRoot } = require('./harness-lib');
    const resolved = resolveHarnessRoot(root);
    out.tier = resolved.tier;
    const state = JSON.parse(fs.readFileSync(path.join(resolved.machinaDir, 'state.json'), 'utf8'));
    out.rigor = state.rigor || 'ship';
    out.phase = state.phase || 'orient';
    out.pass = state.rigor === 'rigor' ? `${state.pass_count || 0}/5` : 'off';
  } catch (_) {}
  try {
    const rigorFile = path.join(require('os').homedir(), '.claude', '.machina', 'rigor');
    if (out.tier === 'global') {
      const r = fs.readFileSync(rigorFile, 'utf8').trim();
      if (r) out.rigor = r;
    }
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
  // used_percentage=0 on fresh sessions — fall through to token math (claude-hud behavior)
  if (typeof native === 'number' && !Number.isNaN(native) && native > 0) {
    return Math.min(100, Math.max(0, Math.round(native)));
  }
  const size = cw.context_window_size;
  if (!size || size <= 0) return 0;
  return Math.min(100, Math.round((getTotalTokens(cw.current_usage) / size) * 100));
}

function contextColor(percent) {
  if (percent >= 85) return RED;
  if (percent >= 70) return YELLOW;
  return GREEN;
}

function quotaColor(percent) {
  if (percent >= 90) return RED;
  if (percent >= 75) return MAGENTA_BRIGHT;
  return BLUE;
}

function bar(percent, width, colorFn) {
  const w = Math.max(0, Math.round(width));
  const pct = Math.min(100, Math.max(0, percent));
  const filled = Math.round((pct / 100) * w);
  const color = colorFn(pct);
  return `${color}${'█'.repeat(filled)}${DIM}${'░'.repeat(w - filled)}${RESET}`;
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

function cavemanBadge() {
  const flag = path.join(require('os').homedir(), '.claude', '.caveman-active');
  try {
    if (!fs.existsSync(flag)) return '';
    const mode = fs.readFileSync(flag, 'utf8').trim();
    return mode ? c(MAGENTA, `[CAV:${mode.toUpperCase()}]`) : c(MAGENTA, '[CAV]');
  } catch (_) {
    return '';
  }
}

function renderUsageWindow(label, percent) {
  if (typeof percent !== 'number' || !Number.isFinite(percent)) return '';
  const pct = Math.round(percent);
  return `${c(DIM, label + ':')} ${bar(pct, 6, quotaColor)} ${quotaColor(pct)}${pct}%${RESET}`;
}

async function main() {
  const payload = await readStdin();
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
  const hasContext = Boolean(payload.context_window);

  const branch = gitBranch(projectDir);
  const dirty = gitDirty(projectDir);

  const parts = [];

  const cav = cavemanBadge();
  if (cav) parts.push(cav);

  parts.push(
    `${c(ORANGE, 'MACHINA')} ${c(DIM, m.tier === 'project' ? m.rigor : 'global')} ${c(CYAN, m.phase)} ${c(DIM, 'pass:')}${c(YELLOW, m.pass)}`
  );

  const model = shortModel(payload);
  if (hasContext || model) {
    const ctxParts = [];
    if (model) ctxParts.push(c(CYAN, `[${model}]`));
    if (hasContext) {
      ctxParts.push(bar(pct, 10, contextColor));
      ctxParts.push(`${contextColor(pct)}${pct}%${RESET}`);
      if (totalTok > 0 && ctxSize > 0) {
        ctxParts.push(c(DIM, `${formatTokens(totalTok)}/${formatTokens(ctxSize)}`));
      } else if (totalTok > 0) {
        ctxParts.push(c(DIM, `${formatTokens(totalTok)} tok`));
      }
      const remaining = ctx.remaining_percentage;
      if (typeof remaining === 'number' && Number.isFinite(remaining)) {
        ctxParts.push(c(DIM, `rem:${Math.round(remaining)}%`));
      }
    }
    parts.push(ctxParts.join(' '));
  }

  const locParts = [c(YELLOW, projectName)];
  if (branch) {
    const branchText = branch + (dirty ? '*' : '');
    locParts.push(`${c(MAGENTA, 'git:(')}${c(CYAN, branchText)}${c(MAGENTA, ')')}`);
  }
  parts.push(locParts.join(' '));

  const rl = payload.rate_limits || {};
  const five = rl.five_hour?.used_percentage;
  const seven = rl.seven_day?.used_percentage;
  const usageParts = [];
  const fivePart = renderUsageWindow('5h', five);
  const sevenPart = typeof seven === 'number' && Number.isFinite(seven) && (five == null || seven >= 80)
    ? renderUsageWindow('7d', seven)
    : '';
  if (fivePart) usageParts.push(fivePart);
  if (sevenPart) usageParts.push(sevenPart);
  if (usageParts.length) parts.push(usageParts.join(' '));

  process.stdout.write(parts.join(` ${c(DIM, '|')} `));
}

main().catch(() => process.stdout.write(c(ORANGE, 'MACHINA')));
