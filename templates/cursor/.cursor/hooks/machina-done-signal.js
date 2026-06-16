#!/usr/bin/env node
// machina-done-signal.js — Cursor postToolUse hook (Write matcher)
// Project-scoped port of .claude/hooks/done-signal-guard.js (non-blocking reminder).

const fs = require('fs');
const path = require('path');

let input = {};
if (!process.stdin.isTTY) {
  try {
    const raw = fs.readFileSync(0, 'utf8').trim();
    if (raw) input = JSON.parse(raw);
  } catch (_) {
    /* non-fatal */
  }
}

const toolInput = input.tool_input || {};
const filePath = toolInput.path || toolInput.file_path || '';
const fileName = filePath ? path.basename(filePath) : 'file';

const context =
  `MACHINA done-signal rule — before marking "${fileName}" work complete:\n` +
  `  run an external verifier: npm test / npm run build / vitest / lint / browser MCP\n` +
  `"It looks right" is not a done signal.`;

process.stdout.write(JSON.stringify({ additional_context: context }));
