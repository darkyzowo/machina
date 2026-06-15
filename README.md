# Machina

**Autonomous, disciplined software synthesis for Claude Code.**

Machina is a global configuration harness for Claude Code that enforces
engineering discipline by default: test-driven development, scaffold hygiene,
layout architecture checkpoints, and a browser-based qualitative UX gate.
It scales from hackathon prototypes to production codebases via a three-tier
profile system that activates only what a project's size justifies.

---

## The Problem Machina Solves

Unconstrained AI coding agents optimise for measurable output. Tests pass.
TypeScript is clean. Lint is silent. And the UI is completely broken —
invisible inputs, unreadable labels, scaffold CSS bleeding into new components.

Machina fixes this by adding two layers the agent cannot skip:
a **browser verification gate** that runs `agent-browser` after every UI
feature, and a **scaffold hygiene audit** that forces the agent to read and
purge generated CSS before writing a single component.

---

## Key Features

### Three-tier profiles
| Profile | For | Tools active |
|---------|-----|-------------|
| `lean` | Hackathons, repos < 50 files | superpowers, agent-browser, CI gates |
| `standard` | Multi-day projects | + spec-kit, caveman |
| `full` | Production, repos > 500 files | + claude-mem, graphify |

Profile is auto-detected at bootstrap and written to `.agent-profile`.
The agent reads this file and activates only the relevant rule sections.

### Hierarchical model routing
| Layer | Model | Assigned work |
|-------|-------|--------------|
| Strategic | Claude Opus 4.8 | Architecture, specs, deep debugging, security |
| Execution | Claude Sonnet 4.6 | Implementation, boilerplate, unit tests |
| Rapid | Claude Haiku 4.5 | Simple transforms, formatting |

### Bifurcated TDD
- **Logic TDD**: failing test → RED → minimal implementation → GREEN
- **Component Behavioral TDD**: spec-driven user-action assertions → RED → build component → GREEN
  Never write a component before its tests.

### Scaffold Hygiene Audit *(v2.0)*
After any scaffold command, the agent reads all generated CSS and HTML
before writing code. Removes `color-scheme` declarations, global
`text-align` resets, and demo class names that bleed into new styles.

### Layout Architecture Checkpoint *(v2.0)*
For multi-view apps, the agent states and justifies the navigation model
(sidebar / tabs / page-swap / modal) before writing the first component.
Default: whichever model keeps the most user context visible.

### Qualitative UX Gate via agent-browser *(v2.0)*
After tests pass for any UI feature, the agent runs `agent-browser` to
open a real browser and take an accessibility snapshot. A seven-item
checklist must pass before the feature is marked done:
- Text readable in light and dark mode
- All buttons have visible labels
- All inputs have visible borders
- No overflow at 375px mobile width
- Primary flow completes without console errors

"Tests pass" is necessary but not sufficient for UI work.

---

## Requirements

- Node.js 24+ (required by agent-browser)
- npm
- uv (`pip install uv` or `brew install uv`)
- git
- bash (Windows: use Git Bash or WSL)

---

## Setup

```bash
git clone https://github.com/darkyzowo/machina
cd machina
bash scripts/global-setup.sh
```

Then open a Claude Code session and run the plugin steps once:

```
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max@ui-ux-pro-max-skill
```

---

## Per-project usage

```bash
cd your-project
git init
cp /path/to/machina/CLAUDE.md .
# .agent-profile is written by detect-profile.sh automatically
# or create manually: echo "lean" > .agent-profile
claude
```

---

## Architecture

```
~/.claude/
  CLAUDE.md              ← global entry point (append-only, not overwritten)
  machina/
    rules.md             ← Machina behavioral spec (written by global-setup.sh)
  skills/
    agent-browser/       ← browser automation skill
    karpathy-guidelines/ ← karpathy coding principles

your-project/
  CLAUDE.md              ← loads AGENT_INSTRUCTIONS.md for per-project context
  AGENT_INSTRUCTIONS.md  ← project-specific overrides (optional)
  .agent-profile         ← lean | standard | full
  orchestrator_config.yaml ← model routing and profile definitions
```

---

## Repository contents

| File | Purpose |
|------|---------|
| `rules.md` | LLM behavioral spec — installed globally by setup |
| `CLAUDE.md` | Per-project session bootstrap |
| `AGENT_INSTRUCTIONS.md` | Per-project behavioral overrides |
| `orchestrator_config.yaml` | Model routing and profile definitions |
| `scripts/global-setup.sh` | One-time global install script |
| `scripts/detect-profile.sh` | Auto-detects lean/standard/full for a project |
| `scripts/bootstrap.sh` | Per-project initialisation |

---

## Changelog

### v2.0.0 — Post-stress-test hardening
- Added Qualitative UX Gate using `agent-browser`
- Added Scaffold Hygiene Audit (read generated CSS before writing any)
- Added Layout Architecture Checkpoint for multi-view apps
- Bifurcated TDD into Logic TDD and Component Behavioral TDD
- Fixed: agent-browser package name (`agent-browser`, not `@vercel/agent-browser`)
- Fixed: snapshot command (`agent-browser snapshot`, no `-i` flag)
- Added Node.js 24+ prerequisite check to global-setup.sh
