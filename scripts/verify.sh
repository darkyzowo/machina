#!/usr/bin/env bash
# verify.sh — fail-loud preflight for Machina v3 harness install
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/dependency-pins.sh
source "$ROOT/scripts/dependency-pins.sh"
PASS=0; FAIL=0; WARN=0

ok()   { printf '  \033[1;32m✓\033[0m %s\n' "$*"; PASS=$((PASS+1)); }
fail() { printf '  \033[1;31m✗\033[0m %s\n' "$*"; FAIL=$((FAIL+1)); }
warn() { printf '  \033[1;33m!\033[0m %s\n' "$*"; WARN=$((WARN+1)); }
have() { command -v "$1" >/dev/null 2>&1; }

HOME_CLAUDE="${HOME:-$USERPROFILE}/.claude"

echo "── Scaffold files ────────────────────────────────────────────────────"
for f in \
  harness.md orchestrator_config.yaml AGENT_INSTRUCTIONS.md CLAUDE.md AGENTS.md \
  scripts/global-setup.sh scripts/profile-setup.sh scripts/harness-init-project.sh \
  scripts/machina-report.sh scripts/check-spec-security.sh \
  .claude/hooks/harness-lib.js .claude/hooks/harness-init.js \
  .claude/hooks/phase-gate.js .claude/hooks/pass-ceiling.js \
  .claude/hooks/secret-guard.js .claude/hooks/verifier-capture.js \
  .claude/commands/machina-status.md .claude/commands/machina-rigor.md \
  .claude/commands/machina-ship.md .claude/settings.example.json \
  templates/machina/state.json benchmarks/README.md Makefile; do
  [ -f "$ROOT/$f" ] && ok "$f" || fail "$f MISSING"
done

echo
echo "── Global harness install (~/.claude) ────────────────────────────────"
for hook in harness-lib.js harness-init.js phase-gate.js pass-ceiling.js secret-guard.js verifier-capture.js; do
  [ -f "$HOME_CLAUDE/hooks/$hook" ] && ok "~/.claude/hooks/$hook" || warn "~/.claude/hooks/$hook absent — run: make global-setup"
done

[ -f "$HOME_CLAUDE/machina/harness.md" ] && ok "~/.claude/machina/harness.md" || warn "harness.md not installed globally"

if [ -f "$HOME_CLAUDE/settings.json" ]; then
  if grep -q 'harness-init' "$HOME_CLAUDE/settings.json" 2>/dev/null; then
    ok "settings.json wires harness-init"
  else
    warn "settings.json missing harness-init — re-run global-setup or copy settings.example.json"
  fi
  if grep -q 'done-signal-guard' "$HOME_CLAUDE/settings.json" 2>/dev/null; then
    warn "settings.json still has done-signal-guard on hot path — remove for v3"
  fi
else
  warn "settings.json absent — launch Claude Code once, then make global-setup"
fi

echo
echo "── Project harness (.machina/) ─────────────────────────────────────────"
if [ -d "$ROOT/.machina" ]; then
  [ -f "$ROOT/.machina/state.json" ] && ok ".machina/state.json" || fail ".machina/state.json missing"
  [ -d "$ROOT/.machina/verifiers" ] && ok ".machina/verifiers/" || fail ".machina/verifiers/ missing"
else
  warn ".machina/ not scaffolded — run: make bootstrap"
fi

echo
echo "── Runtime ───────────────────────────────────────────────────────────"
have node && ok "node $(node -v 2>/dev/null)" || fail "node missing"
have git && ok "git" || fail "git missing"

NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
[ "${NODE_MAJOR:-0}" -ge 24 ] && ok "node >= 24" || warn "node < 24 — agent-browser needs 24+"

echo
echo "── Profile tools ───────────────────────────────────────────────────────"
PROFILE="lean"
[ -f "$ROOT/.agent-profile" ] && PROFILE="$(cat "$ROOT/.agent-profile")"
ok "profile: $PROFILE"

RIGOR="ship"
[ -f "$ROOT/.machina/rigor" ] && RIGOR="$(cat "$ROOT/.machina/rigor")"

if [[ "$RIGOR" == "rigor" ]]; then
  have agent-browser && ok "agent-browser (rigor UX gate)" || fail "agent-browser missing — rigor mode UX gate will SKIPPED. Run: make profile-setup"
fi

if [[ "$PROFILE" == "standard" || "$PROFILE" == "full" ]]; then
  have specify && ok "specify" || warn "specify absent — run: make profile-setup"
fi
if [[ "$PROFILE" == "full" ]]; then
  have claude-mem && ok "claude-mem" || warn "claude-mem absent — run: make profile-setup PROFILE=full"
fi

echo
echo "── Summary ─────────────────────────────────────────────────────────────"
echo "   passed: $PASS   warnings: $WARN   failures: $FAIL"
if [ "$FAIL" -gt 0 ]; then
  echo "   FAIL — fix ✗ items before proceeding."
  exit 1
fi
echo "   OK — harness preflight complete."
exit 0
