#!/usr/bin/env bash
# check-pins.sh — print PINNED vs LATEST for Machina-managed npm packages
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/dependency-pins.sh
source "$SCRIPT_DIR/dependency-pins.sh"

check_npm() {
  local name="$1" pinned="$2"
  local latest
  latest=$(npm view "$name" version 2>/dev/null || echo "unknown")
  local flag=""
  local pinned_major pinned_latest
  pinned_major=$(echo "$pinned" | cut -d. -f1)
  local latest_major
  latest_major=$(echo "$latest" | cut -d. -f1)
  if [ "$latest" != "unknown" ] && [ "$pinned_major" != "$latest_major" ]; then
    flag=" ⚠ MAJOR BEHIND"
  fi
  printf "  %-20s pinned=%-10s latest=%-10s%s\n" "$name" "$pinned" "$latest" "$flag"
}

echo "── Pin drift check ─────────────────────────────────────────────────────"
check_npm "claude-mem" "$CLAUDE_MEM_VERSION"
check_npm "agent-browser" "$AGENT_BROWSER_VERSION"
echo "  graphify (git)     pinned=${GRAPHIFY_PIN}"
echo "  specify-cli (git)  pinned=${SPECIFY_VERSION}"
