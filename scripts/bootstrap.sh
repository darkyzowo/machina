#!/usr/bin/env bash
# =============================================================================
# bootstrap.sh  —  per-project setup. Run once per repo after git init.
#
# Does NOT touch ~/.claude, ~/.codex, or ~/.cursor — ever.
# Config auditing is delegated to audit-configs.sh (read-only, reports only).
#
# Usage:
#   make bootstrap           # interactive (recommended)
#   CI=1 bash scripts/bootstrap.sh  # non-interactive, checks only
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/dependency-pins.sh
source "$ROOT/scripts/dependency-pins.sh"
CFG="$ROOT/orchestrator_config.yaml"

log()  { printf '\033[1;34m[bootstrap]\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m[ok]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[abort]\033[0m %s\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

# ── Guards ────────────────────────────────────────────────────────────────────
[ "$(id -u)" -ne 0 ] || die "do not run as root."
[ -z "${SUDO_USER:-}" ] || die "do not run under sudo."
[ -f "$CFG" ] || die "orchestrator_config.yaml not found. Run from the repo root."

# ── 1. Pin check ──────────────────────────────────────────────────────────────
log "checking version pins"
if grep -qE ':[[:space:]]*"?VERIFY"?' "$CFG"; then
  warn "orchestrator_config.yaml contains unresolved VERIFY pins:"
  grep -nE ':[[:space:]]*"?VERIFY"?' "$CFG" >&2 || true
  die "Resolve every VERIFY pin before bootstrapping. Unpinned tools + autonomous loop = threat model."
fi
ok "pins resolved"

# ── 2. Toolchain preflight ────────────────────────────────────────────────────
log "toolchain preflight"
have git || die "git is required."
if have node; then
  NM="$(node -p 'process.versions.node.split(".")[0]')"
  [ "$NM" -ge 24 ] && log "node $NM ✓" || warn "Node 24+ required for agent-browser (found $NM). Update before running global-setup.sh."
else
  warn "node not found — needed for npm-based installs and skills CLIs."
fi
have uv     || warn "uv not found — needed for spec-kit and graphify."
have python3 || warn "python3 not found — needed for graphify."

# ── 3. Read-only config audit ─────────────────────────────────────────────────
log "running read-only config audit"
bash "$ROOT/scripts/audit-configs.sh" \
  && log "audit report written to reports/config-audit.md" \
  || warn "audit script had issues — check the output above."

# ── 4. Repo hygiene ───────────────────────────────────────────────────────────
log "installing repo hygiene gates"
if have pipx; then
  pipx install pre-commit --quiet 2>/dev/null || true
elif have uv; then
  uv tool install pre-commit --quiet 2>/dev/null || true
fi
if have pre-commit; then
  ( cd "$ROOT" && pre-commit install && pre-commit install --hook-type commit-msg ) \
    || warn "pre-commit install failed — is this a git repo? (run: git init first)"
  log "pre-commit hooks active (gitleaks + conventional commits + hygiene)."
else
  warn "pre-commit not installed — CI secret-scan still gates merges, but local hook missing."
fi

# ── 5. Harness scaffold + profile detection ───────────────────────────────────
log "scaffolding project harness (.machina/)"
bash "$ROOT/scripts/harness-init-project.sh" "$ROOT"

log "detecting project profile (internal tool install tier)"
bash "$ROOT/scripts/detect-profile.sh"
PROFILE="lean"
[ -f "$ROOT/.agent-profile" ] && PROFILE="$(cat "$ROOT/.agent-profile")"
log "active profile: $PROFILE (tool install — user rigor dial: /machina ship | rigor)"

# ── 6. Next steps ─────────────────────────────────────────────────────────────
echo
echo "  ┌─ Machina v3 next steps ───────────────────────────────────────────"
echo "  │"
echo "  │  make profile-setup          # install tools for profile: $PROFILE"
echo "  │  make global-setup           # once per machine (if not done)"
echo "  │"
echo "  │  Inside Claude Code:"
echo "  │    /machina rigor            # full harness loop"
echo "  │    /machina ship             # fast path (default)"
echo "  │    /machina status"
echo "  │"
echo "  │  Optional plugins:"
echo "  │    /plugin marketplace add obra/superpowers-marketplace"
echo "  │    /plugin install superpowers@superpowers-marketplace"
if [[ "$PROFILE" == "standard" || "$PROFILE" == "full" ]]; then
echo "  │    specify init . --integration claude   # after profile-setup"
fi
echo "  └──────────────────────────────────────────────────────────────────"
echo

# ── 7. Verify ─────────────────────────────────────────────────────────────────
log "running preflight check"
bash "$ROOT/scripts/verify.sh"

# ── 8. Human gate ─────────────────────────────────────────────────────────────
if [ "${CI:-0}" = "1" ]; then
  log "CI mode — checks complete. Autonomous loop NOT started."; exit 0
fi
echo
warn "Bootstrap complete. Review reports/config-audit.md before proceeding."
warn "The autonomous loop is NEVER auto-started by this script."
read -r -p '  Type "go" to acknowledge and continue: ' ACK
[ "$ACK" = "go" ] || die "Not acknowledged. (This gate is intentional.)"
log "Acknowledged. Use /machina rigor to start the full harness loop."
