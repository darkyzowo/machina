#!/usr/bin/env bash
# machina statusline v3.1 — Machina harness + context / git / usage HUD
# Claude Code pipes session JSON on stdin.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/statusline.js" 2>/dev/null || echo "MACHINA"
