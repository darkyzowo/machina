#!/usr/bin/env bash
# profile-setup.sh — lazy install of profile-gated tools (not global-setup)
#
# Usage:
#   bash scripts/profile-setup.sh              # uses .agent-profile or lean
#   bash scripts/profile-setup.sh standard
#   PROFILE=full bash scripts/profile-setup.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
# shellcheck source=scripts/dependency-pins.sh
source "$SCRIPT_DIR/dependency-pins.sh"

TARGET="${1:-.}"
ROOT="$(cd "$TARGET" 2>/dev/null && pwd || echo "$REPO_ROOT")"
PROFILE="${PROFILE:-}"

if [ -z "$PROFILE" ] && [ -f "$ROOT/.agent-profile" ]; then
  PROFILE="$(cat "$ROOT/.agent-profile")"
fi
PROFILE="${PROFILE:-lean}"

if [[ ! "$PROFILE" =~ ^(lean|standard|full)$ ]]; then
  echo "  ✗ Invalid profile: $PROFILE (lean | standard | full)"
  exit 1
fi

have() { command -v "$1" >/dev/null 2>&1; }

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Machina Profile Setup — $PROFILE"
echo "═══════════════════════════════════════════════════════════════"

# agent-browser — rigor UX gate (all profiles that use UI verification)
echo ""
echo "→ agent-browser (UX gate)..."
if have npm; then
  npm install -g "agent-browser@${AGENT_BROWSER_VERSION}" 2>/dev/null || true
  if have agent-browser; then
    agent-browser install 2>/dev/null || true
    echo "  ✓ agent-browser@${AGENT_BROWSER_VERSION}"
  else
    echo "  ⚠  agent-browser install failed — UX gate will SKIPPED"
  fi
else
  echo "  ⚠  npm missing — skip agent-browser"
fi

if [[ "$PROFILE" == "standard" || "$PROFILE" == "full" ]]; then
  echo ""
  echo "→ spec-kit (specify CLI)..."
  if have uv; then
    uv tool install specify-cli \
      --from "git+https://github.com/github/spec-kit.git@${SPECIFY_VERSION}" \
      && echo "  ✓ specify-cli@${SPECIFY_VERSION}" \
      || echo "  ⚠  specify-cli install failed"
  else
    echo "  ⚠  uv missing — install uv first"
  fi
fi

if [[ "$PROFILE" == "full" ]]; then
  echo ""
  echo "→ claude-mem (full profile only — NOT started automatically)..."
  if have npm; then
    npm install -g "claude-mem@${CLAUDE_MEM_VERSION}" 2>/dev/null || true
    if have claude-mem; then
      claude-mem install 2>/dev/null || true
      echo "  ✓ claude-mem@${CLAUDE_MEM_VERSION} installed"
      echo "  ℹ  Start manually when needed: claude-mem start"
      echo "  ℹ  Enable plugin in Claude Code settings after install"
    fi
  fi

  echo ""
  echo "→ graphify (full profile only)..."
  if have uv; then
    uv tool install "git+https://github.com/safishamsi/graphify.git@${GRAPHIFY_PIN}" \
      && echo "  ✓ graphify@${GRAPHIFY_PIN}" \
      || echo "  ⚠  graphify install failed"
  fi
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✓ Profile setup complete ($PROFILE)"
echo "  Run inside Claude Code (optional):"
echo "    /plugin marketplace add obra/superpowers-marketplace"
echo "    /plugin install superpowers@superpowers-marketplace"
echo "═══════════════════════════════════════════════════════════════"
echo ""
