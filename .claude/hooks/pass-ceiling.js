#!/usr/bin/env node
// pass-ceiling.js — PreToolUse hook (Edit|Write matcher)
// Counts file edits per session. Warns at pass 4, blocks (exit 1) at pass 5.
// §0 pass ceiling. Reset via /machina-reset after human review.

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// Session ID: prefer CLAUDE_SESSION_ID env var, fall back to ppid hash
const sessionId = process.env.CLAUDE_SESSION_ID
  || crypto.createHash('md5').update(String(process.ppid)).digest('hex').slice(0, 8);

const countsDir = path.join(os.homedir(), '.claude', 'pass-counts');
const counterFile = path.join(countsDir, `${sessionId}.json`);

// Cleanup counter files older than 24h
try {
  const now = Date.now();
  fs.readdirSync(countsDir).forEach(f => {
    const fp = path.join(countsDir, f);
    try {
      if (Date.now() - fs.statSync(fp).mtimeMs > 86400000) fs.unlinkSync(fp);
    } catch (e) {}
  });
} catch (e) {}

// Read or initialise counter
let counter = { count: 0 };
try {
  fs.mkdirSync(countsDir, { recursive: true });
  if (fs.existsSync(counterFile)) {
    counter = JSON.parse(fs.readFileSync(counterFile, 'utf8'));
  }
} catch (e) {}

// Increment
counter.count += 1;

// Persist
try { fs.writeFileSync(counterFile, JSON.stringify(counter), 'utf8'); } catch (e) {}

// React
if (counter.count >= 5) {
  process.stdout.write(
    `🛑 MACHINA PASS CEILING (${counter.count}/5) — HALT.\n` +
    `Do not make further edits. Report current state to human for review. §0.\n` +
    `Run /machina-reset after human review clears the loop.`
  );
  process.exit(1); // Blocks the Edit/Write tool call
} else if (counter.count === 4) {
  process.stdout.write(`⚠ MACHINA PASS 4/5 — next edit triggers halt. Verify externally now.`);
}
// Passes 1–3: silent
