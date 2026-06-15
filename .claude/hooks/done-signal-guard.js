#!/usr/bin/env node
// done-signal-guard.js — PostToolUse hook (Edit|Write matcher)
// Reminds the agent to obtain external verification before marking a task done.
// Non-blocking: always exits 0.
//
// NOTE: PostToolUse hooks do not have access to conversation history.
// This hook fires after every file write as a §0 done-signal reminder.
// The mechanical value is reinforcing the rule at the point of every change.

let input = {};
if (!process.stdin.isTTY) {
  try {
    const raw = require('fs').readFileSync(0, 'utf8').trim();
    if (raw) input = JSON.parse(raw);
  } catch (e) {}
}

const filePath = (input.tool_input || {}).file_path || '';
const fileName = require('path').basename(filePath);

process.stdout.write(
  `⚠ §0 DONE-SIGNAL RULE — before marking "${fileName}" work complete:\n` +
  `  run an external verifier: npm test / npm run build / vitest / lint / agent-browser\n` +
  `  "It looks right" is not a done signal.`
);
