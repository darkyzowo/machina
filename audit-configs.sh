#!/usr/bin/env bash
# audit-configs.sh  —  read-only audit of legacy agent tool configurations.
#
# Reports potential context-pollution sources. NEVER modifies user files.
# This replaces the original "self-healing" step, which was privilege escalation.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT/reports"
OUT="$OUT_DIR/config-audit.md"
mkdir -p "$OUT_DIR"

{
  echo "# Config audit — read-only"
  echo
  echo "_Generated: $(date -u '+%Y-%m-%dT%H:%M:%SZ')_"
  echo
  echo "This report identifies potential context-pollution sources in your"
  echo "existing agent tool configs. **No files were modified.** Any changes"
  echo "are the human operator's decision to make."
  echo

  report_path() {
    local label="$1" real_path="$2"
    local display="${real_path/#$HOME/\~}"
    echo "## $label"
    echo
    echo "Path: \`$display\`"
    echo
    if [ -e "$real_path" ]; then
      echo "Status: present — review manually for rules that conflict with machina."
    else
      echo "Status: absent — nothing to review."
    fi
    echo
  }

  report_path "Claude Code settings"   "$HOME/.claude/settings.json"
  report_path "Codex config"           "$HOME/.codex/config.toml"
  report_path "Cursor rules directory" "$HOME/.cursor/rules/"

  echo "## Project-root legacy rule files"
  echo
  LEGACY=$(find "$ROOT" -maxdepth 2 \
    \( -name '.cursorrules' -o -name '.windsurfrules' \) 2>/dev/null || true)
  if [ -n "$LEGACY" ]; then
    echo "Found — review for conflicts (not auto-edited):"
    echo
    echo "$LEGACY" | sed 's/^/- /'
  else
    echo "None found."
  fi
  echo

} > "$OUT"

printf '\033[1;34m[audit]\033[0m read-only report written: reports/config-audit.md\n'
