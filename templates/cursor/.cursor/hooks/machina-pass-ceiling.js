#!/usr/bin/env node
// machina-pass-ceiling.js — Cursor preToolUse hook (Write matcher)
// Project-scoped port of .claude/hooks/pass-ceiling.js (uses .machina/, not ~/.claude/).
// Blocks further writes at pass 5 (exit 2). Reset: node .cursor/hooks/machina-reset.js

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let input = {};
if (!process.stdin.isTTY) {
  try {
    const raw = fs.readFileSync(0, 'utf8').trim();
    if (raw) input = JSON.parse(raw);
  } catch (_) {
    /* non-fatal */
  }
}

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

const toolInput = input.tool_input || {};
const filePath = toolInput.path || toolInput.file_path || '';
const projectRoot = findProjectRoot(filePath ? path.dirname(filePath) : process.cwd());

const sessionId =
  process.env.CURSOR_SESSION_ID ||
  process.env.CLAUDE_SESSION_ID ||
  crypto.createHash('md5').update(String(process.ppid)).digest('hex').slice(0, 8);

const countsDir = path.join(projectRoot, '.machina', 'pass-counts');
const counterFile = path.join(countsDir, `${sessionId}.json`);

try {
  const now = Date.now();
  if (fs.existsSync(countsDir)) {
    for (const f of fs.readdirSync(countsDir)) {
      const fp = path.join(countsDir, f);
      try {
        if (now - fs.statSync(fp).mtimeMs > 86400000) fs.unlinkSync(fp);
      } catch (_) {}
    }
  }
} catch (_) {}

let counter = { count: 0 };
try {
  fs.mkdirSync(countsDir, { recursive: true });
  if (fs.existsSync(counterFile)) {
    counter = JSON.parse(fs.readFileSync(counterFile, 'utf8'));
  }
} catch (_) {}

counter.count += 1;

try {
  fs.writeFileSync(counterFile, JSON.stringify(counter), 'utf8');
} catch (_) {}

if (counter.count >= 5) {
  const msg =
    `MACHINA PASS CEILING (${counter.count}/5) — HALT.\n` +
    `Do not make further edits. Report current state to human for review.\n` +
    `After review: node .cursor/hooks/machina-reset.js`;
  process.stderr.write(msg);
  process.exit(2);
}

if (counter.count === 4) {
  process.stderr.write('MACHINA PASS 4/5 — next write triggers halt. Run external verifiers now.');
}
