#!/usr/bin/env bash
# migrate-v3.sh — disconnect Machina v2.5 global state; wire v3.1 harness
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
CLAUDE_DIR="${HOME:-$USERPROFILE}/.claude"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Machina v2.5 → v3.1 migration"
echo "═══════════════════════════════════════════════════════════════"

if [ -n "${WINDIR:-}" ] && [ -z "${WSL_DISTRO_NAME:-}" ] && [ -z "${MSYSTEM:-}" ]; then
  echo "  ✗ Use Git Bash or WSL (same environment as Claude Code)."
  exit 1
fi

# Backup settings
if [ -f "$CLAUDE_DIR/settings.json" ]; then
  BACKUP="$CLAUDE_DIR/backups/settings.pre-machina-v3.$(date +%s).json"
  mkdir -p "$CLAUDE_DIR/backups"
  cp "$CLAUDE_DIR/settings.json" "$BACKUP"
  echo "  ✓ Backed up settings.json → $BACKUP"
fi

echo ""
echo "→ Removing v2.5 Machina state files..."
for f in mode.txt current-mode.txt current-profile.txt; do
  if [ -f "$CLAUDE_DIR/$f" ]; then
    rm -f "$CLAUDE_DIR/$f"
    echo "  ✓ removed $f"
  fi
done

if [ -d "$CLAUDE_DIR/pass-counts" ]; then
  rm -rf "$CLAUDE_DIR/pass-counts"
  echo "  ✓ removed legacy ~/.claude/pass-counts/ (v3 uses project .machina/pass-counts/)"
fi

echo ""
echo "→ Installing v3.1 harness files..."
bash "$SCRIPT_DIR/global-setup.sh"

echo ""
echo "→ Wiring settings.json (v3.1 hooks)..."
node "$SCRIPT_DIR/wire-settings.js"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✓ Migration complete"
echo ""
echo "  Removed: mode-init, done-signal-guard, v2.5 mode files"
echo "  Active:  harness-init, phase-gate, secret-guard, pass-ceiling,"
echo "           verifier-capture (PostToolUse + PostToolUseFailure)"
echo ""
echo "  Per project: cd your-app && make -C $REPO_ROOT bootstrap"
echo "  Optional:    make -C $REPO_ROOT profile-setup"
echo "═══════════════════════════════════════════════════════════════"
echo ""
