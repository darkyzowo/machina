#!/usr/bin/env bash
# =============================================================================
# detect-profile.sh  —  evaluate the repo and write .agent-profile.
#
# Profiles:
#   lean      CI + superpowers. Hackathons, quick scripts, repos < 50 files.
#   standard  + spec-kit + caveman. Multi-day projects, team repos.
#   full      + claude-mem + graphify. Production codebases, 500+ files.
#
# Output: .agent-profile (one word) in the target project root.
# The agent reads this at session start (~15 tokens).
#
# Usage:
#   bash scripts/detect-profile.sh              # evaluate current directory
#   bash scripts/detect-profile.sh /path/to/app # evaluate a specific project
# =============================================================================
set -euo pipefail

TARGET="${1:-.}"
ROOT="$(cd "$TARGET" && pwd)"
OUT="$ROOT/.agent-profile"

log()  { printf '\033[1;34m[profile]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }

# ── Signals ───────────────────────────────────────────────────────────────────
FILE_COUNT=$(find "$ROOT" -type f \
  -not -path '*/.git/*'          \
  -not -path '*/node_modules/*'  \
  -not -path '*/.venv/*'         \
  -not -path '*/dist/*'          \
  -not -path '*/build/*'         \
  -not -path '*/__pycache__/*'   \
  2>/dev/null | wc -l | tr -d ' ')

HAS_LOCKFILE=false
for lf in package-lock.json yarn.lock pnpm-lock.yaml uv.lock Pipfile.lock poetry.lock; do
  [ -f "$ROOT/$lf" ] && HAS_LOCKFILE=true && break
done

HAS_SPECKIT=false
{ [ -d "$ROOT/.speckit" ] || [ -f "$ROOT/spec/constitution.md" ]; } && HAS_SPECKIT=true

log "signals: files=$FILE_COUNT, lockfile=$HAS_LOCKFILE, speckit=$HAS_SPECKIT"

# ── Recommend ─────────────────────────────────────────────────────────────────
if [ "$FILE_COUNT" -gt 500 ]; then
  REC="full"
elif [ "$FILE_COUNT" -gt 50 ] || [ "$HAS_LOCKFILE" = true ] || [ "$HAS_SPECKIT" = true ]; then
  REC="standard"
else
  REC="lean"
fi

log "recommended: $REC (internal tool tier — user rigor: /machina ship | rigor)"

# ── Confirm or override ───────────────────────────────────────────────────────
if [ "${CI:-0}" = "1" ] || [ "${NONINTERACTIVE:-0}" = "1" ]; then
  PROFILE="$REC"
else
  echo
  echo "  lean      CI + superpowers.  Hackathons, quick projects."
  echo "  standard  + spec-kit + caveman.  Multi-day / team work."
  echo "  full      + claude-mem + graphify.  Large / long-running repos."
  echo
  read -r -p "  Accept '$REC' (enter) or type lean / standard / full: " CHOICE
  if [ -z "$CHOICE" ]; then
    PROFILE="$REC"
  elif [[ "$CHOICE" =~ ^(lean|standard|full)$ ]]; then
    PROFILE="$CHOICE"
  else
    warn "unrecognised '$CHOICE' — using recommended: $REC"
    PROFILE="$REC"
  fi
fi

# ── Write ─────────────────────────────────────────────────────────────────────
echo "$PROFILE" > "$OUT"
log "wrote .agent-profile: $PROFILE"

echo
echo "  Active for this repo:"
echo "    ✓ CI gates (lint / typecheck / test / build / dep audit / secret scan)"
echo "    ✓ superpowers (TDD, brainstorm, code review)"
if [[ "$PROFILE" == "standard" || "$PROFILE" == "full" ]]; then
  echo "    ✓ spec-kit (/speckit.* commands)"
  echo "    ✓ caveman (scoped token compression)"
fi
if [[ "$PROFILE" == "full" ]]; then
  echo "    ✓ claude-mem (cross-session memory)"
  echo "    ✓ graphify (code knowledge graph, gated to repos >500 files)"
fi
echo
