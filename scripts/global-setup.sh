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
for hook in harness-lib.js harness-hook-utils.js harness-init.js phase-gate.js pass-ceiling.js secret-guard.js verifier-capture.js machina-advance.js; do
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
for cmd in machina-status.md machina-rigor.md machina-ship.md machina-next.md machina-reset.md machina-rules.md machina-ux.md security-review.md security-spec.md project.md casual.md; do
  if [ -f "$REPO_ROOT/.claude/commands/$cmd" ]; then
    cp "$REPO_ROOT/.claude/commands/$cmd" "$COMMANDS_DIR/$cmd"
    echo "  ✓ /${cmd%.md}"
  fi
done

cp "$REPO_ROOT/.claude/statusline.sh" "$HOME/.claude/statusline.sh"
cp "$REPO_ROOT/.claude/statusline.js" "$HOME/.claude/statusline.js"
echo "  ✓ statusline.sh + statusline.js"

# ── CLAUDE.md marker ──────────────────────────────────────────────
mkdir -p "$(dirname "$CLAUDE_MD")"
touch "$CLAUDE_MD"
grep -q "Machina v3" "$CLAUDE_MD" 2>/dev/null \
  || echo -e "\n# Machina v3 — https://github.com/darkyzowo/machina\n# Harness injected by harness-init.js | /machina rigor | /machina ship" >> "$CLAUDE_MD"
echo "  ✓ CLAUDE.md updated (idempotent)"

# ── Wire hooks (prefer migrate-v3.sh for upgrades) ─────────────────
SETTINGS="$HOME/.claude/settings.json"
if [ -f "$SETTINGS" ]; then
  node "$SCRIPT_DIR/wire-settings.js" || echo "  ⚠  wire-settings.js failed — run: bash scripts/migrate-v3.sh"
else
  echo "  ℹ  settings.json not found — launch Claude Code once, then: bash scripts/migrate-v3.sh"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✓ Machina v3.1 global setup complete"
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
