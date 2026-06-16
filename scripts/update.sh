#!/usr/bin/env bash
# =============================================================================
# update.sh — Update installed Machina files without reinstalling all tools.
#
# Diffs ~/.claude/machina/ against the repo, then applies on confirmation.
# Skips npm/uv installs — run global-setup.sh for first-time or full reinstall.
#
# Usage:
#   bash scripts/update.sh           # interactive diff + apply
#   NONINTERACTIVE=1 bash scripts/update.sh  # auto-apply (CI)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
MACHINA_DIR="$HOME/.claude/machina"
HOOKS_DIR="$HOME/.claude/hooks"
COMMANDS_DIR="$HOME/.claude/commands"

log()  { printf '\033[1;34m[update]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
ok()   { printf '\033[1;32m[ok]\033[0m %s\n' "$*"; }

NONINTERACTIVE="${NONINTERACTIVE:-0}"
CHANGED=0

diff_and_stage() {
  local label="$1" src="$2" dst="$3"
  if [ ! -f "$dst" ]; then
    warn "$label: not installed — run global-setup.sh first"
    return
  fi
  if ! diff -q "$src" "$dst" &>/dev/null; then
    echo
    log "$label has changes:"
    diff --color=always "$dst" "$src" || true
    CHANGED=$((CHANGED + 1))
    PENDING_SRCS+=("$src")
    PENDING_DSTS+=("$dst")
    PENDING_LABELS+=("$label")
  else
    ok "$label up to date"
  fi
}

PENDING_SRCS=()
PENDING_DSTS=()
PENDING_LABELS=()

echo
echo "══════════════════════════════════════════════════════════════"
echo "  Machina Update — checking installed files against repo"
echo "══════════════════════════════════════════════════════════════"

diff_and_stage "rules.md"          "$REPO_ROOT/rules.md"                          "$MACHINA_DIR/rules.md"
diff_and_stage "mode-init.js"      "$REPO_ROOT/.claude/hooks/mode-init.js"        "$HOOKS_DIR/mode-init.js"
diff_and_stage "pass-ceiling.js"   "$REPO_ROOT/.claude/hooks/pass-ceiling.js"     "$HOOKS_DIR/pass-ceiling.js"
diff_and_stage "done-signal-guard.js" "$REPO_ROOT/.claude/hooks/done-signal-guard.js" "$HOOKS_DIR/done-signal-guard.js"
diff_and_stage "/project command"  "$REPO_ROOT/.claude/commands/project.md"       "$COMMANDS_DIR/project.md"
diff_and_stage "/casual command"   "$REPO_ROOT/.claude/commands/casual.md"        "$COMMANDS_DIR/casual.md"
diff_and_stage "/machina-reset"    "$REPO_ROOT/.claude/commands/machina-reset.md" "$COMMANDS_DIR/machina-reset.md"

if [ "$CHANGED" -eq 0 ]; then
  echo
  ok "All installed files are up to date."
  exit 0
fi

echo
log "$CHANGED file(s) differ."

if [ "$NONINTERACTIVE" != "1" ]; then
  read -r -p "  Apply updates? [y/N] " CHOICE
  [[ "$CHOICE" =~ ^[Yy]$ ]] || { warn "Aborted — no files changed."; exit 0; }
fi

for i in "${!PENDING_SRCS[@]}"; do
  cp "${PENDING_SRCS[$i]}" "${PENDING_DSTS[$i]}"
  ok "updated: ${PENDING_LABELS[$i]}"
done

echo
echo "══════════════════════════════════════════════════════════════"
ok "Machina update complete. Restart Claude Code to apply."
echo "══════════════════════════════════════════════════════════════"
echo
