#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Machina Global Setup v3.0
# Installs harness hooks + commands only. Profile tools: profile-setup.sh
#
# Requirements: Node.js 24+, git, bash
# Windows: Git Bash or WSL — NOT plain PowerShell
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
MACHINA_DIR="$HOME/.claude/machina"
CLAUDE_MD="$HOME/.claude/CLAUDE.md"
HOOKS_DIR="$HOME/.claude/hooks"
COMMANDS_DIR="$HOME/.claude/commands"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Machina Global Setup v3.0"
echo "═══════════════════════════════════════════════════════════════"

# ── Windows / PowerShell guard ────────────────────────────────────
if [ -n "${WINDIR:-}" ] && [ -z "${WSL_DISTRO_NAME:-}" ] && [ -z "${MSYSTEM:-}" ]; then
  echo ""
  echo "  ✗ Plain PowerShell/CMD detected."
  echo "    Machina requires Git Bash or WSL on Windows."
  echo "    Example: wsl bash scripts/global-setup.sh"
  exit 1
fi

# ── Prerequisites ─────────────────────────────────────────────────
echo ""
echo "→ Checking prerequisites..."

if ! command -v node &>/dev/null; then
  echo "  ✗ Node.js not found. Install Node.js 24+ from https://nodejs.org"
  exit 1
fi

NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 24 ]; then
  echo "  ⚠  Node.js $(node --version) — Node 24+ recommended for agent-browser"
else
  echo "  ✓ Node.js $(node --version)"
fi

if ! command -v git &>/dev/null; then
  echo "  ✗ git not found"
  exit 1
fi
echo "  ✓ git"

# ── Harness spec ──────────────────────────────────────────────────
echo ""
echo "→ Installing harness spec..."
mkdir -p "$MACHINA_DIR"

if [ -f "$REPO_ROOT/harness.md" ]; then
  cp "$REPO_ROOT/harness.md" "$MACHINA_DIR/harness.md"
  echo "  ✓ harness.md"
else
  echo "  ✗ harness.md not found"
  exit 1
fi

# Legacy alias for tools expecting rules.md
cp "$REPO_ROOT/harness.md" "$MACHINA_DIR/rules.md"
echo "  ✓ rules.md (legacy alias)"

# ── Harness hooks ─────────────────────────────────────────────────
echo ""
echo "→ Installing harness hooks..."

mkdir -p "$HOOKS_DIR"
for hook in harness-lib.js harness-init.js phase-gate.js pass-ceiling.js secret-guard.js verifier-capture.js; do
  cp "$REPO_ROOT/.claude/hooks/$hook" "$HOOKS_DIR/$hook"
  echo "  ✓ $hook"
done

# Legacy hooks kept but not wired by default
for legacy in mode-init.js done-signal-guard.js; do
  [ -f "$REPO_ROOT/.claude/hooks/$legacy" ] && cp "$REPO_ROOT/.claude/hooks/$legacy" "$HOOKS_DIR/$legacy" || true
done

# ── Slash commands ────────────────────────────────────────────────
echo ""
echo "→ Installing /machina commands..."

mkdir -p "$COMMANDS_DIR"
for cmd in machina-status.md machina-rigor.md machina-ship.md machina-next.md machina-reset.md machina-rules.md security-review.md security-spec.md project.md casual.md; do
  if [ -f "$REPO_ROOT/.claude/commands/$cmd" ]; then
    cp "$REPO_ROOT/.claude/commands/$cmd" "$COMMANDS_DIR/$cmd"
    echo "  ✓ /${cmd%.md}"
  fi
done

cp "$REPO_ROOT/.claude/statusline.sh" "$HOME/.claude/statusline.sh"
echo "  ✓ statusline.sh"

# ── CLAUDE.md marker ──────────────────────────────────────────────
mkdir -p "$(dirname "$CLAUDE_MD")"
touch "$CLAUDE_MD"
grep -q "Machina v3" "$CLAUDE_MD" 2>/dev/null \
  || echo -e "\n# Machina v3 — https://github.com/darkyzowo/machina\n# Harness injected by harness-init.js | /machina rigor | /machina ship" >> "$CLAUDE_MD"
echo "  ✓ CLAUDE.md updated (idempotent)"

# ── Wire hooks into settings.json (quiet — no statusMessage on hot path) ─
SETTINGS="$HOME/.claude/settings.json"
if [ -f "$SETTINGS" ]; then
  node -e "
const fs = require('fs');
const home = process.env.HOME || process.env.USERPROFILE;
const p = home + '/.claude/settings.json';
const s = JSON.parse(fs.readFileSync(p, 'utf8'));
if (!s.hooks) s.hooks = {};

function wire(hookList, event, matcher, hookFile) {
  if (!hookList) hookList = [];
  const needle = hookFile;
  const exists = hookList.some(g =>
    (g.hooks || []).some(h => h.command && h.command.includes(needle))
  );
  if (!exists) {
    const entry = { hooks: [{ type: 'command', command: 'node \"' + home + '/.claude/hooks/' + hookFile + '\"', timeout: 5 }] };
    if (matcher) entry.matcher = matcher;
    hookList.push(entry);
    console.log('  ✓ wired ' + hookFile + ' → ' + event);
  } else {
    console.log('  ✓ ' + hookFile + ' already wired');
  }
  return hookList;
}

// Remove done-signal-guard and mode-init from defaults if patching fresh
s.hooks.SessionStart = (s.hooks.SessionStart || []).filter(g =>
  !(g.hooks || []).some(h => h.command && (h.command.includes('mode-init') || h.command.includes('done-signal')))
);
s.hooks.PostToolUse = (s.hooks.PostToolUse || []).filter(g =>
  !(g.hooks || []).some(h => h.command && h.command.includes('done-signal-guard'))
);

s.hooks.SessionStart = wire(s.hooks.SessionStart, 'SessionStart', null, 'harness-init.js');

s.hooks.PreToolUse = s.hooks.PreToolUse || [];
s.hooks.PreToolUse = wire(s.hooks.PreToolUse, 'PreToolUse', 'Edit|Write', 'secret-guard.js');
s.hooks.PreToolUse = wire(s.hooks.PreToolUse, 'PreToolUse', 'Edit|Write', 'phase-gate.js');
s.hooks.PreToolUse = wire(s.hooks.PreToolUse, 'PreToolUse', 'Edit|Write', 'pass-ceiling.js');

s.hooks.PostToolUse = s.hooks.PostToolUse || [];
s.hooks.PostToolUse = wire(s.hooks.PostToolUse, 'PostToolUse', 'Bash', 'verifier-capture.js');

fs.writeFileSync(p, JSON.stringify(s, null, 2));
" || echo "  ⚠  Could not patch settings.json — see settings.example.json"
else
  echo "  ℹ  settings.json not found — copy from settings.example.json after first Claude Code launch"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✓ Machina v3.0 global setup complete"
echo ""
echo "  Next steps:"
echo "    cd your-project"
echo "    make bootstrap              # scaffold .machina/"
echo "    make profile-setup          # install tools for your profile"
echo "    claude                      # start session"
echo ""
echo "  Inside Claude Code (optional):"
echo "    /plugin marketplace add obra/superpowers-marketplace"
echo "    /plugin install superpowers@superpowers-marketplace"
echo "═══════════════════════════════════════════════════════════════"
echo ""
