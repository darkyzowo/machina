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

# ── §3c spec-kit (specify CLI) ───────────────────────────────────────
echo ""
echo "→ [3c] Installing spec-kit (specify CLI) for standard/full profiles..."
if command -v uv &>/dev/null; then
  uv tool install specify-cli \
    --from 'git+https://github.com/github/spec-kit.git@v0.10.2' \
    && echo "  ✓ specify-cli installed" \
    || echo "  ⚠  specify-cli install failed — standard/full profiles need this. Retry: uv tool install specify-cli --from 'git+https://github.com/github/spec-kit.git@v0.10.2'"
else
  echo "  ⚠  uv not found — skipping spec-kit (install uv first, then re-run global-setup.sh)"
fi

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

# ── §7 Mode-aware session system ────────────────────────────────
echo ""
echo "→ [7/7] Installing Machina mode system..."

mkdir -p "$HOME/.claude/hooks"
cp "$REPO_ROOT/.claude/hooks/mode-init.js"         "$HOME/.claude/hooks/mode-init.js"
cp "$REPO_ROOT/.claude/hooks/done-signal-guard.js" "$HOME/.claude/hooks/done-signal-guard.js"
cp "$REPO_ROOT/.claude/hooks/pass-ceiling.js"      "$HOME/.claude/hooks/pass-ceiling.js"
mkdir -p "$HOME/.claude/pass-counts"
echo "  ✓ mode-init.js, done-signal-guard.js, pass-ceiling.js installed to ~/.claude/hooks/"

mkdir -p "$HOME/.claude/commands"
cp "$REPO_ROOT/.claude/commands/project.md"       "$HOME/.claude/commands/project.md"
cp "$REPO_ROOT/.claude/commands/casual.md"        "$HOME/.claude/commands/casual.md"
cp "$REPO_ROOT/.claude/commands/machina-reset.md" "$HOME/.claude/commands/machina-reset.md"
echo "  ✓ /project, /casual, /machina-reset commands installed to ~/.claude/commands/"

# Add mode comment to CLAUDE.md (rules injected by hook — no @-import needed)
mkdir -p "$(dirname "$CLAUDE_MD")"
touch "$CLAUDE_MD"
grep -q "mode-init" "$CLAUDE_MD" \
  || echo -e "\n# Machina — https://github.com/darkyzowo/machina\n# Rules injected by mode-init hook — project = §0-§4/5/6 per profile, casual = §4 only\n# Switch mid-session: /project or /casual" >> "$CLAUDE_MD"
echo "  ✓ CLAUDE.md updated (idempotent)"

# Idempotent patch: wire all Machina hooks into settings.json
SETTINGS="$HOME/.claude/settings.json"
if [ -f "$SETTINGS" ]; then
  node -e "
const fs = require('fs'), home = process.env.HOME || process.env.USERPROFILE;
const p = home + '/.claude/settings.json';
const s = JSON.parse(fs.readFileSync(p, 'utf8'));
if (!s.hooks) s.hooks = {};

// SessionStart: mode-init
if (!s.hooks.SessionStart) s.hooks.SessionStart = [];
const hasModeInit = s.hooks.SessionStart.some(function(g){ return (g.hooks||[]).some(function(h){ return h.command && h.command.includes('mode-init'); }); });
if (!hasModeInit) {
  s.hooks.SessionStart.push({hooks:[{type:'command',command:'node \"'+home+'/.claude/hooks/mode-init.js\"',timeout:10,statusMessage:'Detecting session mode...'}]});
  console.log('  ✓ mode-init wired into SessionStart');
} else { console.log('  ✓ mode-init already wired (skipped)'); }

// PreToolUse: pass-ceiling
if (!s.hooks.PreToolUse) s.hooks.PreToolUse = [];
const hasPassCeiling = s.hooks.PreToolUse.some(function(g){ return (g.hooks||[]).some(function(h){ return h.command && h.command.includes('pass-ceiling'); }); });
if (!hasPassCeiling) {
  s.hooks.PreToolUse.push({matcher:'Edit|Write',hooks:[{type:'command',command:'node \"'+home+'/.claude/hooks/pass-ceiling.js\"',timeout:5,statusMessage:'Checking pass ceiling...'}]});
  console.log('  ✓ pass-ceiling wired into PreToolUse');
} else { console.log('  ✓ pass-ceiling already wired (skipped)'); }

// PostToolUse: done-signal-guard
if (!s.hooks.PostToolUse) s.hooks.PostToolUse = [];
const hasDoneGuard = s.hooks.PostToolUse.some(function(g){ return (g.hooks||[]).some(function(h){ return h.command && h.command.includes('done-signal-guard'); }); });
if (!hasDoneGuard) {
  s.hooks.PostToolUse.push({matcher:'Edit|Write',hooks:[{type:'command',command:'node \"'+home+'/.claude/hooks/done-signal-guard.js\"',timeout:5,statusMessage:'Checking done-signal rule...'}]});
  console.log('  ✓ done-signal-guard wired into PostToolUse');
} else { console.log('  ✓ done-signal-guard already wired (skipped)'); }

fs.writeFileSync(p, JSON.stringify(s, null, 2));
" || echo "  ⚠  Could not patch settings.json — add hooks manually (see settings.example.json)"
else
  echo "  ℹ  settings.json not found — run global-setup.sh again after first Claude Code launch"
fi

# ── Summary ─────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✓ Machina v2.1.0 setup complete"
echo ""
echo "  Manual steps — run these inside a Claude Code session:"
echo "  /plugin marketplace add obra/superpowers-marketplace"
echo "  /plugin install superpowers@superpowers-marketplace"
echo "  /plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill"
echo "  /plugin install ui-ux-pro-max@ui-ux-pro-max-skill"
echo "  /plugin marketplace add jarrodwatts/claude-hud"
echo "  /plugin install claude-hud"
echo "  /claude-hud:setup"
echo ""
echo "  For existing projects without .agent-profile, run once:"
echo "  cd your-project && bash $REPO_ROOT/scripts/detect-profile.sh"
echo ""
echo "  Start your first Machina session:"
echo "  cd your-project && claude"
echo "═══════════════════════════════════════════════════════════════"
echo ""
