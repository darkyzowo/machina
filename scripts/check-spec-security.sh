#!/usr/bin/env bash
# check-spec-security.sh — CI gate: specs must include Abuse cases when present
set -euo pipefail

ROOT="${1:-.}"
ROOT="$(cd "$ROOT" && pwd)"
FAIL=0

check_file() {
  local f="$1"
  if [ ! -f "$f" ]; then return 0; fi
  if grep -qiE '##[[:space:]]*Abuse cases' "$f"; then
    echo "  ✓ $f"
  else
    echo "  ✗ $f — missing '## Abuse cases' heading"
    FAIL=1
  fi
}

if [ -f "$ROOT/SECURITY_SPEC.md" ]; then
  check_file "$ROOT/SECURITY_SPEC.md"
fi

if [ -d "$ROOT/specs" ]; then
  while IFS= read -r -d '' sec; do
    check_file "$sec"
  done < <(find "$ROOT/specs" -name 'security.md' -print0 2>/dev/null)
fi

if [ "$FAIL" -ne 0 ]; then
  echo "Spec security gate FAILED — add ## Abuse cases to security specs."
  exit 1
fi

echo "Spec security gate passed."
exit 0
