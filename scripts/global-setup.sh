#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Machina Global Setup v2.0
# Run once per machine to install the global Machina infrastructure.
#
# Requirements: Node.js 24+, npm, uv, git, bash
# Windows: run via Git Bash or WSL — not PowerShell
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
MACHINA_DIR="$HOME/.claude/machina"
CLAUDE_MD="$HOME/.claude/CLAUDE.md"
CLAUDE_SKILLS_DIR="$HOME/.claude/skills"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Machina Global Setup v2.0"
echo "═══════════════════════════════════════════════════════════════"

# ── §0 Prerequisites ────────────────────────────────────────────
echo ""
echo "→ Checking prerequisites..."

if ! command -v node &>/dev/null; then
  echo "  ✗ Node.js not found. Install Node.js 24+ from https://nodejs.org"
  exit 1
fi

NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 24 ]; then
  echo "  ⚠  Node.js $(node --version) detected. agent-browser requires Node 24+."
  echo "     The UX gate will not function until Node is updated."
  echo "     Continuing with remaining setup..."
else
  echo "  ✓ Node.js $(node --version)"
fi

if ! command -v uv &>/dev/null; then
  echo "  ✗ uv not found. Install from https://docs.astral.sh/uv/"
  exit 1
fi
echo "  ✓ uv $(uv --version)"

# ── §1 Memory engine ────────────────────────────────────────────
echo ""
echo "→ [1/7] Installing claude-mem..."
npm install -g claude-mem
claude-mem install
npx claude-mem start &>/dev/null &
echo "  ✓ claude-mem installed and worker backgrounded"

# ── §2 Codebase graphing ────────────────────────────────────────
echo ""
echo "→ [2/7] Installing graphify (from canonical source)..."
uv tool install git+https://github.com/safishamsi/graphify.git
export PATH="$HOME/.local/bin:$PATH"
echo "  ✓ graphify installed"
echo "  ℹ  Add to your shell profile to persist:"
echo "     export PATH=\"\$HOME/.local/bin:\$PATH\""

# ── §3 Browser automation — UX gate ─────────────────────────────
echo ""
echo "→ [3/7] Installing agent-browser..."
npm install -g agent-browser
agent-browser install
echo "  ✓ agent-browser installed with Chromium"

# Install agent-browser Claude Code skill
echo ""
echo "→ [3b] Installing agent-browser Claude Code skill..."
mkdir -p "$CLAUDE_SKILLS_DIR/agent-browser"
curl -fsSL \
  "https://raw.githubusercontent.com/vercel-labs/agent-browser/main/skills/agent-browser/SKILL.md" \
  -o "$CLAUDE_SKILLS_DIR/agent-browser/SKILL.md"
echo "  ✓ agent-browser skill installed to ~/.claude/skills/agent-browser/"

# ── §4 Karpathy guidelines skill ────────────────────────────────
echo ""
echo "→ [4/7] Installing karpathy-guidelines skill..."
npx skills add https://github.com/multica-ai/andrej-karpathy-skills --skill karpathy-guidelines -g
echo "  ✓ karpathy-guidelines installed"

# ── §5 Vercel web design guidelines ─────────────────────────────
echo ""
echo "→ [5/7] Installing Vercel web-design-guidelines skill..."
npx skills add vercel-labs/agent-skills@web-design-guidelines -g
echo "  ✓ web-design-guidelines installed"

# ── §6 Write Machina rules ───────────────────────────────────────
echo ""
echo "→ [6/7] Installing Machina rules to $MACHINA_DIR/rules.md..."
mkdir -p "$MACHINA_DIR"

if [ -f "$REPO_ROOT/rules.md" ]; then
  cp "$REPO_ROOT/rules.md" "$MACHINA_DIR/rules.md"
  echo "  ✓ rules.md copied from repo"
else
  echo "  ✗ rules.md not found at $REPO_ROOT/rules.md"
  exit 1
fi

# ── §7 Idempotent CLAUDE.md integration ─────────────────────────
echo ""
echo "→ [7/7] Linking rules into $CLAUDE_MD..."
mkdir -p "$(dirname "$CLAUDE_MD")"
touch "$CLAUDE_MD"
grep -q "@machina/rules.md" "$CLAUDE_MD" \
  || echo -e "\n# Machina — https://github.com/darkyzowo/machina\n@machina/rules.md" >> "$CLAUDE_MD"
echo "  ✓ @machina/rules.md linked (idempotent)"

# ── Summary ─────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✓ Machina v2.0 setup complete"
echo ""
echo "  Manual steps — run these inside a Claude Code session:"
echo "  /plugin marketplace add obra/superpowers-marketplace"
echo "  /plugin install superpowers@superpowers-marketplace"
echo "  /plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill"
echo "  /plugin install ui-ux-pro-max@ui-ux-pro-max-skill"
echo ""
echo "  Start your first Machina session:"
echo "  cd your-project && claude"
echo "═══════════════════════════════════════════════════════════════"
echo ""
