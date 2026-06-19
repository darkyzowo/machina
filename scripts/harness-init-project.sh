#!/usr/bin/env bash
# harness-init-project.sh — scaffold .machina/ in a project (per-project bootstrap)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
TARGET="${1:-.}"
ROOT="$(cd "$TARGET" && pwd)"
TEMPLATE="$REPO_ROOT/templates/machina"

log() { printf '\033[1;34m[harness]\033[0m %s\n' "$*"; }

mkdir -p "$ROOT/.machina/verifiers" "$ROOT/.machina/pass-counts"

if [ ! -f "$ROOT/.machina/state.json" ]; then
  cp "$TEMPLATE/state.json" "$ROOT/.machina/state.json"
  log "created .machina/state.json"
fi

if [ ! -f "$ROOT/.machina/harness.yaml" ]; then
  cp "$TEMPLATE/harness.yaml" "$ROOT/.machina/harness.yaml"
  log "created .machina/harness.yaml"
fi

if [ ! -f "$ROOT/.machina/rigor" ]; then
  echo "ship" > "$ROOT/.machina/rigor"
  log "default rigor: ship"
fi

log "harness scaffold ready at $ROOT/.machina/"
