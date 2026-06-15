#!/usr/bin/env bash
# =============================================================================
# global-setup.sh  —  one-time global Claude Code environment setup.
#
# What it does:
#   ✓ Shows your existing ~/.claude/CLAUDE.md before touching anything
#   ✓ Creates ~/.claude/machina/ with canonical machina rules
#   ✓ APPENDS a single @-import line to CLAUDE.md — existing content untouched
#   ✓ Runs `uv tool update-shell` to fix PATH for uv-installed binaries
#   ✓ Starts the claude-mem worker (install ≠ running)
#
# What it never does:
#   ✗ Overwrite ~/.claude/CLAUDE.md  (RTK, personal rules, etc. are preserved)
#   ✗ Modify ~/.claude/settings.json
#   ✗ Delete or rewrite any user tool config
#   ✗ Start any autonomous agent loop
#
# Re-running is safe — fully idempotent.
#
# Usage:
#   bash scripts/global-setup.sh
#   NONINTERACTIVE=1 bash scripts/global-setup.sh
#   MACHINA_REPO_URL=https://github.com/you/machina bash scripts/global-setup.sh
# =============================================================================
set -euo pipefail

log()  { printf '\033[1;34m[global-setup]\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m[ok]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[abort]\033[0m %s\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

# ── Guards ────────────────────────────────────────────────────────────────────
[ "$(id -u)" -ne 0 ] || die "do not run as root."
[ -z "${SUDO_USER:-}" ]  || die "do not run under sudo."

CLAUDE_DIR="$HOME/.claude"
MACHINA_DIR="$CLAUDE_DIR/machina"
GLOBAL_MD="$CLAUDE_DIR/CLAUDE.md"
REPO_URL="${MACHINA_REPO_URL:-$(git -C "$(dirname "${BASH_SOURCE[0]}")/.." remote get-url origin 2>/dev/null || echo 'https://github.com/darkyzowo/machina')}"

# ── Phase 1: read-only audit ──────────────────────────────────────────────────
log "phase 1 — read-only audit (nothing written yet)"
echo

if [ -f "$GLOBAL_MD" ]; then
  WORD_COUNT=$(wc -w < "$GLOBAL_MD")
  ok "$HOME/.claude/CLAUDE.md — ${WORD_COUNT} words"
  echo
  echo "  ┌─ existing contents ──────────────────────────────────────────"
  sed 's/^/  │ /' "$GLOBAL_MD"
  echo "  └──────────────────────────────────────────────────────────────"
else
  warn "$HOME/.claude/CLAUDE.md not found — will be created."
fi

echo
echo "  uv tools installed:"
have uv && uv tool list 2>/dev/null | sed 's/^/    /' || echo "    uv not on PATH"
echo
echo "  claude-mem:"
if have claude-mem; then
  claude-mem status 2>/dev/null | sed 's/^/    /' || echo "    (status call failed)"
else
  echo "    not on PATH"
fi
echo

if [ "${NONINTERACTIVE:-0}" != "1" ]; then
  read -r -p '  Continue to install? (y/N) ' CONFIRM
  [[ "$CONFIRM" =~ ^[Yy]$ ]] || die "Cancelled."
fi

# ── Phase 2: create ~/.claude/machina/ and write rules.md ─────────────────────
log "phase 2 — writing machina rules"
mkdir -p "$MACHINA_DIR"

cat > "$MACHINA_DIR/rules.md" << RULES
# machina — ${REPO_URL}

Hard limits (every project):
- TDD mandatory: write the failing test first, wait for a real red signal, then
  minimal code to green. Forbidden from writing implementation before backpressure.
- Surgical changes only: edit targeted logic, nothing adjacent.
- HALT on ambiguity: state assumptions, ask before coding.
- 5-pass recursion ceiling: stop and hand off to human review.
- Merge gate: CI (lint + typecheck + test + build) + dep audit + secret scan.

Profile — read .agent-profile in the project root:
  lean:     CI + superpowers (TDD, brainstorm, review)
  standard: + spec-kit (/speckit.* commands) + caveman
  full:     + claude-mem (memory MCP) + graphify (code graph, repos >500 files)
If .agent-profile is absent, assume lean.

Memory (full profile): search → timeline → get_observations.
Repos >500 files: query code graph instead of reading files.
RULES

ok "wrote $HOME/.claude/machina/rules.md"

# ── Phase 3: append @-import to CLAUDE.md (never overwrite) ──────────────────
log "phase 3 — appending @-import to $HOME/.claude/CLAUDE.md"

MARKER="# machina workflow"

if [ -f "$GLOBAL_MD" ] && grep -qF "$MARKER" "$GLOBAL_MD"; then
  ok "$HOME/.claude/CLAUDE.md already has machina import — skipping (idempotent)"
else
  # Ensure a clean newline separator before appending.
  if [ -f "$GLOBAL_MD" ] && [ -s "$GLOBAL_MD" ]; then
    echo >> "$GLOBAL_MD"
  fi
  printf '%s\n@machina/rules.md\n' "$MARKER — ${REPO_URL}" >> "$GLOBAL_MD"
  ok "appended @machina/rules.md import — all existing content preserved"
fi

# ── Phase 4: fix PATH for uv-installed binaries ───────────────────────────────
log "phase 4 — PATH fix for uv tools"
if have uv; then
  uv tool update-shell 2>/dev/null \
    && ok "uv tool update-shell ran" \
    || warn "uv tool update-shell had no-op or failed — may already be configured"
  warn "Open a new terminal (or source your shell rc) for PATH changes to take effect."
else
  warn "uv not found — install from https://docs.astral.sh/uv/ then re-run."
fi

# ── Phase 5: start claude-mem worker ──────────────────────────────────────────
log "phase 5 — claude-mem worker"
if have claude-mem; then
  claude-mem start 2>/dev/null \
    && ok "claude-mem worker started" \
    || warn "claude-mem start returned non-zero (may already be running — check: claude-mem status)"
else
  warn "claude-mem not on PATH. Open a new terminal after phase 4, then run: claude-mem start"
fi

# ── Phase 6: copy statusline script ──────────────────────────────────────────
log "phase 6 — installing HUD statusline"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
STATUSLINE_SRC="$REPO_ROOT/.claude/statusline.sh"
STATUSLINE_DST="$CLAUDE_DIR/statusline.sh"

if [ -f "$STATUSLINE_SRC" ]; then
  cp "$STATUSLINE_SRC" "$STATUSLINE_DST"
  chmod +x "$STATUSLINE_DST"
  ok "copied statusline.sh → $HOME/.claude/statusline.sh"
else
  warn "statusline.sh not found in repo — skipping"
fi

echo
echo "  ┌─ add this to ~/.claude/settings.json ───────────────────────────"
echo "  │"
echo "  │  \"statusLine\": {"
echo "  │    \"type\": \"command\","
echo "  │    \"command\": \"bash \\\"$HOME/.claude/statusline.sh\\\"\""
echo "  │  },"
echo "  │"
echo "  │  Full template: $REPO_ROOT/.claude/settings.example.json"
echo "  └──────────────────────────────────────────────────────────────────"
echo
warn "settings.json is never auto-modified — paste the block above manually."

# ── Final report ──────────────────────────────────────────────────────────────
echo
log "final state"
echo
echo "  $HOME/.claude/CLAUDE.md — last 6 lines:"
tail -6 "$GLOBAL_MD" 2>/dev/null | sed 's/^/    /' || echo "    (not found)"
echo
echo "  $HOME/.claude/machina/rules.md — $(wc -w < "$MACHINA_DIR/rules.md") words"
echo "  $HOME/.claude/statusline.sh    — $([ -f "$STATUSLINE_DST" ] && echo 'installed' || echo 'NOT installed')"
echo
echo "  Next steps:"
echo "    1. Open a new terminal for PATH changes."
echo "    2. claude doctor                        # confirm agent is healthy"
echo "    3. Open Claude Code → /plugins         # should list superpowers"
echo "    4. Add statusLine block to ~/.claude/settings.json (shown above)"
echo "    5. Verify repo URL in $HOME/.claude/machina/rules.md"
echo "    6. Per-project: cd <project> && make bootstrap"
echo
ok "global setup complete — no project files created or modified."
