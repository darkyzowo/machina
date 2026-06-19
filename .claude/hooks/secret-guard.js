#!/usr/bin/env node
// secret-guard.js — PreToolUse (Edit|Write): Tier A secret pattern block (always on)

const SECRET_PATTERNS = [
  { name: 'AWS access key', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'AWS secret key', re: /(?:aws)?[_-]?secret[_-]?access[_-]?key\s*[=:]\s*['"]?[A-Za-z0-9/+=]{40}/i },
  { name: 'Private key header', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'GitHub PAT', re: /ghp_[A-Za-z0-9]{36,}/ },
  { name: 'Generic API key assignment', re: /(?:api[_-]?key|password|secret)\s*[=:]\s*['"][^'"\s]{8,}['"]/i },
];

let input = {};
if (!process.stdin.isTTY) {
  try {
    const raw = require('fs').readFileSync(0, 'utf8').trim();
    if (raw) input = JSON.parse(raw);
  } catch (_) {}
}

const toolInput = input.tool_input || {};
const content = toolInput.content || toolInput.new_string || toolInput.new_str || '';
if (!content || typeof content !== 'string') process.exit(0);

for (const { name, re } of SECRET_PATTERNS) {
  if (re.test(content)) {
    process.stdout.write(
      `MACHINA SECRET GUARD — write blocked.\n` +
        `  pattern: ${name}\n` +
        `  use environment variables or a secrets manager — never commit literals.`
    );
    process.exit(1);
  }
}

process.exit(0);
