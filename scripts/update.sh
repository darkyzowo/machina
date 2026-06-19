#!/usr/bin/env bash
# update.sh — Update installed Machina harness files without reinstalling tools
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
PENDING_SRCS=()
PENDING_DSTS=()
PENDING_LABELS=()

diff_and_stage() {
  local label="$1" src="$2" dst="$3"
  if [ ! -f "$dst" ]; then
    warn "$label: not installed — will install"
    CHANGED=$((CHANGED + 1))
    PENDING_SRCS+=("$src")
    PENDING_DSTS+=("$dst")
    PENDING_LABELS+=("$label")
    return
  fi
  if ! diff -q "$src" "$dst" &>/dev/null; then
    echo
    log "$label has changes:"
    diff --color=always "$dst" "$src" 2>/dev/null || diff "$dst" "$src" || true
    CHANGED=$((CHANGED + 1))
    PENDING_SRCS+=("$src")
    PENDING_DSTS+=("$dst")
    PENDING_LABELS+=("$label")
  else
    ok "$label up to date"
  fi
}

echo
echo "══════════════════════════════════════════════════════════════"
echo "  Machina v3 Update"
echo "══════════════════════════════════════════════════════════════"

diff_and_stage "harness.md"           "$REPO_ROOT/harness.md"                          "$MACHINA_DIR/harness.md"
diff_and_stage "rules.md (alias)"     "$REPO_ROOT/harness.md"                          "$MACHINA_DIR/rules.md"

for hook in harness-lib.js harness-init.js phase-gate.js pass-ceiling.js secret-guard.js verifier-capture.js; do
  diff_and_stage "$hook" "$REPO_ROOT/.claude/hooks/$hook" "$HOOKS_DIR/$hook"
done

for cmd in machina-status.md machina-rigor.md machina-ship.md machina-next.md machina-reset.md machina-rules.md security-spec.md security-review.md project.md casual.md; do
  [ -f "$REPO_ROOT/.claude/commands/$cmd" ] && \
    diff_and_stage "/$cmd" "$REPO_ROOT/.claude/commands/$cmd" "$COMMANDS_DIR/$cmd"
done

diff_and_stage "statusline.sh" "$REPO_ROOT/.claude/statusline.sh" "$HOME/.claude/statusline.sh"

if [ "$CHANGED" -eq 0 ]; then
  echo
  ok "All installed files are up to date."
  exit 0
fi

echo
log "$CHANGED file(s) differ."

if [ "$NONINTERACTIVE" != "1" ]; then
  read -r -p "  Apply updates? [y/N] " CHOICE
  [[ "$CHOICE" =~ ^[Yy]$ ]] || { warn "Aborted."; exit 0; }
fi

for i in "${!PENDING_SRCS[@]}"; do
  mkdir -p "$(dirname "${PENDING_DSTS[$i]}")"
  cp "${PENDING_SRCS[$i]}" "${PENDING_DSTS[$i]}"
  ok "updated: ${PENDING_LABELS[$i]}"
done

echo
ok "Update complete. Restart Claude Code to apply."
echo
