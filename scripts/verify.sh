#!/usr/bin/env bash
# verify.sh  —  "is anything missing?" preflight check.
# Exits 0 if all required pieces are present, 1 if any are absent.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PASS=0; FAIL=0; WARN=0

ok()   { printf '  \033[1;32m✓\033[0m %s\n' "$*"; PASS=$((PASS+1)); }
fail() { printf '  \033[1;31m✗\033[0m %s\n' "$*"; FAIL=$((FAIL+1)); }
warn() { printf '  \033[1;33m!\033[0m %s\n' "$*"; WARN=$((WARN+1)); }
have() { command -v "$1" >/dev/null 2>&1; }

echo "── Required: scaffold files ──────────────────────────────────────────"
for f in \
  orchestrator_config.yaml  \
  AGENT_INSTRUCTIONS.md     \
  CLAUDE.md                 \
  AGENTS.md                 \
  .gitignore                \
  .pre-commit-config.yaml   \
  .github/workflows/ci.yml  \
  scripts/global-setup.sh      \
  scripts/bootstrap.sh         \
  scripts/detect-profile.sh    \
  scripts/verify.sh            \
  scripts/audit-configs.sh     \
  scripts/dependency-pins.sh   \
  scripts/install-cursor.sh    \
  Makefile; do
  [ -f "$ROOT/$f" ] && ok "$f" || fail "$f MISSING"
done

echo
echo "── Required: Cursor integration template ─────────────────────────────"
for f in \
  templates/cursor/.cursor/rules/machina-integration.mdc \
  templates/cursor/.cursor/hooks.json \
  templates/cursor/.cursor/hooks/machina-pass-ceiling.js \
  templates/cursor/.cursor/hooks/machina-done-signal.js \
  templates/cursor/.cursor/hooks/machina-session-init.js \
  templates/cursor/.cursor/hooks/machina-reset.js \
  templates/cursor/.machina/state.json; do
  [ -f "$ROOT/$f" ] && ok "$f" || fail "$f MISSING"
done

echo
if grep -qE ':[[:space:]]*"?VERIFY"?' "$ROOT/orchestrator_config.yaml" 2>/dev/null; then
  fail "unresolved VERIFY pins in orchestrator_config.yaml"
else
  ok "all pins resolved"
fi

echo
echo "── Required: gitignore covers memory artifacts ───────────────────────"
grep -q 'graphify-out/' "$ROOT/.gitignore" \
  && ok ".gitignore excludes graphify-out/" \
  || fail ".gitignore missing graphify-out/ (graph artifacts must not commit)"

echo
echo "── Required: host runtime ────────────────────────────────────────────"
have git && ok "git" || fail "git missing"
if have node; then
  NM="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null)"
  [ "${NM:-0}" -ge 24 ] && ok "node $NM (>=24)" || fail "node $NM — need >=24 (required by agent-browser)"
else
  warn "node absent (needed for npm installs and skills CLIs)"
fi

echo
echo "── Profile ───────────────────────────────────────────────────────────"
PROFILE="lean"
if [ -f "$ROOT/.agent-profile" ]; then
  PROFILE="$(cat "$ROOT/.agent-profile")"
  ok "profile: $PROFILE"
else
  warn ".agent-profile not set — run: make profile (agent will default to lean)"
fi

echo
echo "── Optional / gated (profile: $PROFILE) ──────────────────────────────"
have pre-commit && ok "pre-commit" || warn "pre-commit absent (CI still gates merges)"
have claude && ok "claude code CLI" || warn "claude CLI absent — run: claude doctor"
if [[ "$PROFILE" == "standard" || "$PROFILE" == "full" ]]; then
  have uv      && ok "uv"      || warn "uv absent — needed for spec-kit + graphify"
  have specify && ok "specify" || warn "specify absent — run: uv tool install specify-cli ..."
fi
if [[ "$PROFILE" == "full" ]]; then
  have claude-mem && ok "claude-mem" || warn "claude-mem absent — run: npx claude-mem@12.3.8 install"
  have graphify   && ok "graphify"   || warn "graphify absent — run: uv tool install git+...@v3"
fi

echo
echo "── Summary ───────────────────────────────────────────────────────────"
echo "   passed: $PASS   warnings: $WARN   failures: $FAIL"
if [ "$FAIL" -gt 0 ]; then
  echo "   FAIL — fix the ✗ items above before proceeding."
  exit 1
fi
echo "   OK — required setup complete. Warnings are optional/gated tools."
