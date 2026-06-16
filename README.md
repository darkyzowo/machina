# Machina

**Autonomous, disciplined software synthesis for Claude Code and Cursor.**

Machina is a configuration harness that enforces engineering discipline by
default: test-driven development, scaffold hygiene, layout architecture
checkpoints, and a browser-based qualitative UX gate. It scales from hackathon
prototypes to production codebases via a three-tier profile system.

Works with **Claude Code** (global hooks + slash commands) and **Cursor**
(project-level rules + hooks via `install-cursor.sh`).

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

## Quick start

Pick your agent. Both paths share the same behavioral spec (`rules.md`,
`AGENT_INSTRUCTIONS.md`) and `.agent-profile` tier system.

### Claude Code

```bash
# Once per machine
git clone https://github.com/darkyzowo/machina
cd machina
bash scripts/global-setup.sh

# Once per project
cd your-project
cp /path/to/machina/CLAUDE.md .
bash /path/to/machina/scripts/detect-profile.sh .
claude
```

Inside Claude Code, install plugins once (see [Setup](#setup-claude-code) below).

### Cursor

```bash
# Once per project (from your app repo — not the machina repo)
cd your-project
bash /path/to/machina/scripts/detect-profile.sh .
bash /path/to/machina/scripts/install-cursor.sh .
```

Then **open `your-project` as the Cursor workspace root** (File → Open Folder),
reload the window, enable **cursor-ide-browser** MCP, and start an Agent chat.

Verify: ask the agent *"What is my active Machina profile and current phase?"*
— expect your profile (e.g. `standard`) and phase `orient`.

| Step | Claude Code | Cursor |
|------|-------------|--------|
| Global install | `global-setup.sh` → `~/.claude/` | Not required |
| Per-project profile | `detect-profile.sh .` | `detect-profile.sh .` |
| Per-project harness | Copy `CLAUDE.md` | `install-cursor.sh .` |
| Enforcement | `~/.claude/hooks/` (blocks tools) | `.cursor/hooks/` (project-scoped) |
| UX gate | `agent-browser` CLI | `cursor-ide-browser` MCP (primary) |
| Spec workflow | `/speckit.*` slash commands | `specify init . --integration cursor` |
| Task queue | `specs/**/tasks.md` | `specs/**/tasks.md` (same) |

**Note:** Machina uses **spec-kit** artifacts (`specs/**/spec.md`, `plan.md`,
`tasks.md`) — not a single `SPEC.md` file.

---

## Requirements

- Node.js 24+ (required by agent-browser)
- npm
- uv (`pip install uv` or `brew install uv`)
- git
- bash (Windows: use Git Bash or WSL)

---

## Setup (Claude Code)

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
/plugin marketplace add jarrodwatts/claude-hud
/plugin install claude-hud
/claude-hud:setup
```

---

## Per-project usage

```bash
cd your-project
git init
cp /path/to/machina/CLAUDE.md .
bash /path/to/machina/scripts/detect-profile.sh .
claude
```

For existing projects, run `detect-profile.sh` with your project path (the `.`
must be your app directory, not the machina repo):

```bash
bash /path/to/machina/scripts/detect-profile.sh /path/to/your-project
```

---

## Cursor

Machina's Claude Code enforcement (`~/.claude/hooks/`, slash commands) does **not**
apply inside Cursor automatically. Use the **project-level** integration instead —
it never modifies `~/.claude` or `~/.cursor`.

```bash
cd your-project
bash /path/to/machina/scripts/detect-profile.sh .
bash /path/to/machina/scripts/install-cursor.sh .
# or: make -C /path/to/machina cursor-install TARGET=/path/to/your-project
```

**Critical:** Open `your-project` as the **workspace root** in Cursor. Machina
rules and hooks load from the project `.cursor/` directory — not from a parent
folder or multi-root workspace unless that project is the root.

Then:

1. **Reload window** (`Ctrl+Shift+P` → Developer: Reload Window) so hooks load.
2. Enable **cursor-ide-browser** MCP for the qualitative UX gate.
3. **Standard/full profile:** `specify init . --integration cursor` for spec-kit
   artifacts (`specs/**/spec.md`, `plan.md`, `tasks.md`).
4. **Reset pass ceiling** after human review: `node .cursor/hooks/machina-reset.js`.

| Claude Code | Cursor equivalent |
|-------------|-------------------|
| `mode-init.js` (SessionStart) | `machina-session-init.js` + `.cursor/rules/machina-integration.mdc` |
| `pass-ceiling.js` (PreToolUse) | `machina-pass-ceiling.js` on `Write\|StrReplace` |
| `done-signal-guard.js` (PostToolUse) | `machina-done-signal.js` |
| `/machina-reset` | `node .cursor/hooks/machina-reset.js` |
| `agent-browser` CLI | `cursor-ide-browser` MCP (primary) |
| `/speckit.*` | spec-kit after `specify init . --integration cursor` |

Casual mode in Cursor: tell the agent `casual mode` in chat (no `/casual` slash command).

See `templates/cursor/README.md` for hook details and verification steps.

---

## Mode system

Machina auto-detects session mode at startup and injects rules conditionally — no static import, no wasted tokens on casual sessions.

| Signal | Mode | Rules injected |
|--------|------|---------------|
| `.agent-profile` in project dir | Project | §0–§4/§5/§6 per profile tier |
| `CLAUDE.md` in project dir (no `.agent-profile`) | Project | §0–§4 (lean, no §5/§6) |
| Neither present | Casual | §4 only (surgical changes) |

Switch mid-session with `/project` or `/casual`. To persist the profile for a project, run `detect-profile.sh` in the project root.

### Manual mode override

Create `~/.claude/mode.txt` containing `project` or `casual` to force a mode
regardless of project structure. Delete the file to restore auto-detection.

```bash
echo "project" > ~/.claude/mode.txt   # force project mode
rm ~/.claude/mode.txt                  # restore auto-detection
```

This is an escape hatch for edge cases — prefer `.agent-profile` for
persistent project configuration.

---

## Architecture

```
~/.claude/
  CLAUDE.md              ← global entry point (append-only, not overwritten)
  hooks/
    mode-init.js         ← SessionStart hook: detects mode, injects rules conditionally
  commands/
    project.md           ← /project slash command (load full rules mid-session)
    casual.md            ← /casual slash command (suspend TDD/UX gate)
  machina/
    rules.md             ← Machina behavioral spec (written by global-setup.sh)
  skills/
    agent-browser/       ← browser automation skill
    karpathy-guidelines/ ← karpathy coding principles

your-project/
  CLAUDE.md              ← loads AGENT_INSTRUCTIONS.md (Claude Code)
  AGENTS.md              ← cross-agent entry (Cursor, Codex, etc.)
  AGENT_INSTRUCTIONS.md  ← project-specific overrides (optional)
  .agent-profile         ← lean | standard | full (written by detect-profile.sh)
  .cursor/               ← Cursor only (installed by install-cursor.sh)
    rules/machina-integration.mdc
    hooks.json
    hooks/machina-session-init.js
    hooks/machina-pass-ceiling.js
    hooks/machina-done-signal.js
    hooks/machina-reset.js
  .machina/              ← Cursor phase state + pass counters (gitignored)
  orchestrator_config.yaml ← model routing and profile definitions (optional in app repos)
```

---

## File precedence

Per-project file load order (highest → lowest priority):

| Priority | File | Purpose |
|----------|------|---------|
| 1 (highest) | `AGENT_INSTRUCTIONS.md` | Per-project behavioral overrides — **edit this** for project-specific rules. Prefix overrides with `OVERRIDE:` so they're visible in diffs. |
| 2 | `CLAUDE.md` | Session bootstrap. Sources `AGENT_INSTRUCTIONS.md`. Copy from the Machina repo into your project; do not add rules directly here. |
| 3 (lowest) | `~/.claude/machina/rules.md` | Global harness spec. Installed by `global-setup.sh`. Do not edit directly — update `rules.md` in the repo and re-run setup. |

**Corollary:** to override a Machina rule for a specific project, add the override to
`AGENT_INSTRUCTIONS.md` with an `OVERRIDE:` prefix. Never edit `rules.md` directly.

---

## Repository contents

| File | Purpose |
|------|---------|
| `rules.md` | LLM behavioral spec — installed globally by setup |
| `CLAUDE.md` | Per-project session bootstrap |
| `AGENT_INSTRUCTIONS.md` | Per-project behavioral overrides |
| `orchestrator_config.yaml` | Model routing and profile definitions |
| `scripts/global-setup.sh` | One-time global install script |
| `scripts/dependency-pins.sh` | Pinned versions for all Machina-managed dependencies |
| `scripts/detect-profile.sh` | Auto-detects lean/standard/full for a project |
| `scripts/bootstrap.sh` | Per-project initialisation |
| `scripts/install-cursor.sh` | Per-project Cursor rules + hooks (never touches `~/.cursor`) |
| `templates/cursor/` | Source template for `.cursor/` and `.machina/` |
| `.claude/hooks/mode-init.js` | SessionStart hook — profile-aware rules injection |
| `.claude/hooks/done-signal-guard.js` | PostToolUse hook — done-signal rule reminder |
| `.claude/hooks/pass-ceiling.js` | PreToolUse hook — 5-pass ceiling counter |
| `.claude/commands/project.md` | `/project` slash command |
| `.claude/commands/casual.md` | `/casual` slash command |
| `.claude/commands/machina-reset.md` | `/machina-reset` — reset pass counter |

---

## Changelog

### v2.3.0 — Cursor integration (project-scoped)
- New `templates/cursor/` — rules, hooks, `.machina/state.json`
- New `scripts/install-cursor.sh` and `make cursor-install TARGET=dir`
- `machina-session-init.js` — sessionStart profile injection (port of `mode-init.js`)
- Pass ceiling + done-signal hooks match on `Write|StrReplace` (not `Write` alone)
- State machine rule: one-phase-per-turn RED gate, verifier artifacts, MCP-first UX gate
- `detect-profile.sh` accepts target directory arg (fixes writing to machina repo by mistake)
- UX gate: `cursor-ide-browser` MCP primary; `agent-browser` CLI fallback
- `AGENTS.md` documents Cursor install; Claude Code paths unchanged
- `verify.sh` checks full Cursor template scaffold

### v2.2.0 — Mechanical enforcement + audit hardening
- Profile-aware section injection: `mode-init.js` now reads `.agent-profile` and injects only §0–§4 (lean), §0–§5 (standard), or §0–§6 (full). §0 always active.
- CLAUDE.md-only projects correctly default to lean (§0–§4), not full §0–§6
- New hook: `done-signal-guard.js` (PostToolUse) — reminds agent to obtain external verification before marking work done. §0 done-signal rule.
- New hook: `pass-ceiling.js` (PreToolUse) — counts Edit/Write calls per session; warns at pass 4, blocks at pass 5. §0 pass ceiling.
- New command: `/machina-reset` — resets pass counter after human review clears a loop
- `global-setup.sh`: installs all three hooks, wires them into `settings.json` idempotently
- `global-setup.sh`: installs `specify-cli` (spec-kit) for standard/full profiles
- New `scripts/dependency-pins.sh`: single source of truth for all pinned versions (graphify, specify-cli, claude-mem, superpowers)
- `graphify` install now pinned to `@v3` via `dependency-pins.sh`
- `rules.md` §3 UX gate: Step 0 (agent-browser check) + Step 0b (curl 200 check) — SKIPPED ≠ PASSED
- `README.md`: documented `~/.claude/mode.txt` manual override escape hatch
- `README.md`: added file precedence table (AGENT_INSTRUCTIONS > CLAUDE.md > rules.md)
- `scripts/verify.sh`: `dependency-pins.sh` added to required scaffold check

### v2.1.0 — Mode-aware sessions
- Added `mode-init.js` SessionStart hook: auto-detects project vs casual mode, injects rules conditionally
- Project mode auto-detected via `.agent-profile` or `CLAUDE.md` in project root
- Casual mode: only §4 surgical changes active — saves ~1,766 tokens/session on non-project work
- Added `/project` and `/casual` slash commands for mid-session mode switching
- Added `detect-profile.sh` documentation for existing projects without `.agent-profile`
- Added claude-hud to setup and bootstrap instructions
- Replaced static `@machina/rules.md` CLAUDE.md import with conditional hook injection

### v2.0.0 — Post-stress-test hardening
- Added Qualitative UX Gate using `agent-browser`
- Added Scaffold Hygiene Audit (read generated CSS before writing any)
- Added Layout Architecture Checkpoint for multi-view apps
- Bifurcated TDD into Logic TDD and Component Behavioral TDD
- Fixed: agent-browser package name (`agent-browser`, not `@vercel/agent-browser`)
- Fixed: snapshot command (`agent-browser snapshot`, no `-i` flag)
- Added Node.js 24+ prerequisite check to global-setup.sh
