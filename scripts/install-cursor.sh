#!/usr/bin/env bash
# =============================================================================
# install-cursor.sh — Copy Machina Cursor integration into a target project.
#
# Installs project-level .cursor/ and .machina/ from templates/cursor/.
# NEVER modifies ~/.cursor, ~/.claude, ~/.codex, or any global agent config.
#
# Usage:
#   bash scripts/install-cursor.sh              # install into current directory
#   bash scripts/install-cursor.sh /path/to/app # install into target
#   FORCE=1 bash scripts/install-cursor.sh      # overwrite existing machina files
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
TEMPLATE="$REPO_ROOT/templates/cursor"
TARGET="${1:-.}"
TARGET="$(cd "$TARGET" && pwd)"
FORCE="${FORCE:-0}"

log()  { printf '\033[1;34m[cursor]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[abort]\033[0m %s\n' "$*" >&2; exit 1; }

[ -d "$TEMPLATE" ] || die "templates/cursor not found at $TEMPLATE"
[ "$TARGET" != "/" ] || die "refusing to install into filesystem root."
[ "$TARGET" != "$REPO_ROOT" ] || die "refusing to install into the machina repo itself. Pass your project path: bash scripts/install-cursor.sh /path/to/your-project"

copy_file() {
  local src="$1" dst="$2"
  if [ -f "$dst" ] && [ "$FORCE" != "1" ]; then
    warn "exists (skipped): $dst — set FORCE=1 to overwrite"
    return 0
  fi
  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst"
  log "installed: $dst"
}

copy_tree() {
  local src_dir="$1" dst_dir="$2"
  if [ ! -d "$src_dir" ]; then
    return 0
  fi
  mkdir -p "$dst_dir"
  # shellcheck disable=SC2044
  for src in $(find "$src_dir" -type f | sort); do
    rel="${src#"$src_dir"/}"
    copy_file "$src" "$dst_dir/$rel"
  done
}

log "installing Machina Cursor integration into: $TARGET"
log "template: $TEMPLATE"

# Agent entry points (idempotent — do not overwrite project customizations)
if [ ! -f "$TARGET/AGENTS.md" ]; then
  cp "$REPO_ROOT/AGENTS.md" "$TARGET/AGENTS.md"
  log "installed: AGENTS.md"
else
  log "AGENTS.md present — skipped"
fi

if [ ! -f "$TARGET/AGENT_INSTRUCTIONS.md" ]; then
  cp "$REPO_ROOT/AGENT_INSTRUCTIONS.md" "$TARGET/AGENT_INSTRUCTIONS.md"
  log "installed: AGENT_INSTRUCTIONS.md"
else
  log "AGENT_INSTRUCTIONS.md present — skipped"
fi

# Cursor integration tree
copy_tree "$TEMPLATE/.cursor" "$TARGET/.cursor"
copy_tree "$TEMPLATE/.machina" "$TARGET/.machina"

# Ensure hook scripts are executable (no-op on Windows without chmod)
for hook in machina-pass-ceiling.js machina-done-signal.js machina-reset.js; do
  if [ -f "$TARGET/.cursor/hooks/$hook" ]; then
    chmod +x "$TARGET/.cursor/hooks/$hook" 2>/dev/null || true
  fi
done

# Suggest .agent-profile if missing
if [ ! -f "$TARGET/.agent-profile" ]; then
  warn ".agent-profile missing — run: bash $REPO_ROOT/scripts/detect-profile.sh \"$TARGET\""
fi

# Append .machina/ to .gitignore if marker absent
GITIGNORE="$TARGET/.gitignore"
MARKER="# machina cursor state"
if [ -f "$GITIGNORE" ]; then
  if ! grep -qF "$MARKER" "$GITIGNORE" 2>/dev/null; then
    {
      echo ""
      echo "$MARKER (do not commit)"
      echo ".machina/"
    } >> "$GITIGNORE"
    log "appended .machina/ to .gitignore"
  fi
else
  {
    echo "$MARKER (do not commit)"
    echo ".machina/"
  } > "$GITIGNORE"
  log "created .gitignore with .machina/"
fi

echo
log "Cursor integration installed."
echo "  1. Restart Cursor (or reload window) so hooks load."
echo "  2. Enable cursor-ide-browser MCP for the UX gate."
echo "  3. Standard/full profile: specify init . --integration cursor"
echo "  4. Reset pass ceiling: node .cursor/hooks/machina-reset.js"
