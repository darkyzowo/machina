#!/usr/bin/env node
// harness-hook-utils.js — Claude Code hook I/O helpers (exit 2 blocks PreToolUse)

const fs = require('fs');

function readHookInput() {
  if (process.stdin.isTTY) return {};
  try {
    const raw = fs.readFileSync(0, 'utf8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

/** Block PreToolUse — exit 2 + stderr is required by Claude Code */
function block(message) {
  process.stderr.write(String(message).trim() + '\n');
  process.exit(2);
}

function warn(message) {
  process.stderr.write(String(message).trim() + '\n');
}

function parseBashResult(input) {
  const toolInput = input.tool_input || {};
  const command = toolInput.command || '';
  const tr = input.tool_response || {};
  const stdout = tr.stdout ?? input.tool_output ?? input.stdout ?? '';
  const stderr = tr.stderr ?? input.stderr ?? '';

  let exitCode = 0;
  if (typeof tr.exitCode === 'number') exitCode = tr.exitCode;
  else if (typeof tr.exit_code === 'number') exitCode = tr.exit_code;
  else if (typeof input.exit_code === 'number') exitCode = input.exit_code;
  else if (input.error && /non-zero|exit code|exited with/i.test(String(input.error))) exitCode = 1;

  return { command, stdout, stderr, exitCode };
}

function hookCwd(input, filePath) {
  return (
    input.cwd ||
    input.working_directory ||
    (filePath ? require('path').dirname(filePath) : process.cwd())
  );
}

module.exports = { readHookInput, block, warn, parseBashResult, hookCwd };
