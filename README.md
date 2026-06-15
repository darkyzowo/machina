# machina

> *the machine that ships*

Global agentic dev harness for Claude Code, Codex, and Cursor.
Profile-gated (lean / standard / full). Hygiene-first. TDD-enforced.

---

## Why this exists

Every tool in this stack is individually defensible. The failure mode is
loading all of them unconditionally — an agent spends tokens satisfying
meta-rules instead of solving the problem. machina solves this with
**profiles**: the project's size and horizon determine which tools activate.
The boring engineering (CI, secret scan, dep audit, pre-commit) runs at every
profile. The heavier orchestration tools gate in only when they earn their cost.

---

## Profiles

`detect-profile.sh` counts your repo files, checks for lockfiles and spec-kit
init, and writes `.agent-profile` (one word). The agent reads it at session
start — roughly 15 tokens of overhead.

| Profile    | What's installed                                              | Best for                            |
|------------|---------------------------------------------------------------|-------------------------------------|
| `lean`     | CI gates + superpowers (TDD, brainstorm, review)              | Hackathons, weekend projects        |
| `standard` | + spec-kit (`/speckit.*` commands) + caveman                  | Multi-day projects, team repos      |
| `full`     | + claude-mem (cross-session memory) + graphify (code graph)   | Large codebases, multi-week efforts |

The behavioural rules — TDD, Karpathy guidelines, surgical changes — apply
at **all** profiles. The profile only controls which tools are installed.

---

## Two-script architecture

```
global-setup.sh   Run once, globally.
                  Writes ~/.claude/machina/rules.md.
                  APPENDS one @-import line to your existing CLAUDE.md.
                  Existing content (RTK rules, personal prefs) is untouched.
                  Idempotent — safe to re-run.

bootstrap.sh      Run once per project.
                  Installs repo hygiene gates (pre-commit, CI hooks).
                  Detects and writes .agent-profile.
                  Verifies prerequisites.
                  Stops at a human gate before any autonomous execution.
                  Never touches ~/.claude.
```

---

## File manifest

| File | Layer | Purpose |
|---|---|---|
| `orchestrator_config.yaml` | system | pinned deps, model routing, gates — LLM never reads this |
| `AGENT_INSTRUCTIONS.md` | LLM | full behavioural spec: TDD, Karpathy, memory, compression |
| `CLAUDE.md` | LLM | Claude Code entry: profile table + hard limits + pointer |
| `AGENTS.md` | LLM | Codex / Cursor / Gemini entry: same pointer, agent notes |
| `.github/workflows/ci.yml` | system | lint, typecheck, test, build, dep audit, secret scan |
| `.pre-commit-config.yaml` | system | local gitleaks + hygiene + conventional commits |
| `.gitignore` | system | excludes memory artifacts, secrets, `.agent-profile` |
| `.env.example` | system | env vars documented by profile |
| `.claude/commands/security-review.md` | LLM | read-only audit slash command |
| `scripts/global-setup.sh` | system | one-time global setup (append-only) |
| `scripts/bootstrap.sh` | system | per-project: audit → hooks → profile → verify → gate |
| `scripts/detect-profile.sh` | system | evaluates repo, writes `.agent-profile` |
| `scripts/verify.sh` | system | preflight "nothing is missing" check |
| `scripts/audit-configs.sh` | system | read-only legacy config audit |
| `Makefile` | system | ergonomic entry points for all scripts |

---

## Prerequisites

- `git`
- A coding agent: Claude Code (recommended), Codex, or Cursor
- `uv` + Python ≥ 3.10 — for spec-kit and graphify (standard+ / full profiles)
- Node ≥ 18 — for npm installs and skills CLIs

---

## Setup: global (run once)

### Option A — shell script (recommended)

```bash
git clone https://github.com/darkyzowo/machina
bash machina/scripts/global-setup.sh
```

What happens:
1. Shows your existing `~/.claude/CLAUDE.md` — read-only, no writes yet.
2. Asks you to confirm before proceeding.
3. Creates `~/.claude/machina/` and writes the canonical rules file.
4. Appends `@machina/rules.md` to your CLAUDE.md — all existing content preserved.
5. Runs `uv tool update-shell` to fix PATH for uv-installed binaries.
6. Starts the `claude-mem` worker.

### Option B — Claude Code one-shot prompt

Paste this into Claude Code if you prefer to stay in the agent. It handles
the RTK / existing CLAUDE.md conflict correctly — confirmed in testing.

```
Global machina setup. No project context — do not create any project files.

PHASE 1 — read-only audit. Report findings as a table, then STOP and wait
for "go":
1. /doctor — show output
2. /plugins — list installed
3. Read ~/.claude/settings.json — note: hooks, model setting, permission flags
4. Read ~/.claude/CLAUDE.md — show full contents and word count
5. Check host: uv --version, pre-commit --version, specify --version,
   claude-mem status

PHASE 2 — install (only after "go", in this order):
a. /plugin marketplace add obra/superpowers-marketplace
b. /plugin install superpowers@superpowers-marketplace
c. uv tool install specify-cli --from 'git+https://github.com/github/spec-kit.git@v0.10.2'
d. uv tool install pre-commit   (or: pipx install pre-commit)
e. npx claude-mem@12.3.8 install
f. uv tool update-shell                ← fixes PATH — do not skip
g. claude-mem start                    ← starts worker — do not skip

PHASE 3 — update ~/.claude/CLAUDE.md (append-only, NEVER overwrite):
1. Create ~/.claude/machina/ directory
2. Write ~/.claude/machina/rules.md with exactly this content:
---
# machina — https://github.com/darkyzowo/machina
Hard limits (every project): TDD mandatory — failing test first, wait for
real red signal, minimal code to green. Surgical changes only — targeted
logic, nothing adjacent. HALT on ambiguity, ask. 5-pass ceiling then hand
off. Merges gated: CI + dep audit + secret scan.
Profile: read .agent-profile (lean / standard / full). Absent → lean.
  lean: CI + superpowers
  standard: + spec-kit + caveman
  full: + claude-mem + graphify (repos >500 files)
Memory (full): search → timeline → get_observations. Large repos: graph query.
---
3. APPEND these two lines to the END of the existing CLAUDE.md. Do not
   remove, reorder, or rewrite any existing content:
   # machina workflow — https://github.com/darkyzowo/machina
   @machina/rules.md
4. Show me the full resulting CLAUDE.md before confirming done.

Terminal condition: /doctor green, /plugins shows superpowers, specify
--version works in a new terminal, claude-mem status shows worker running,
~/.claude/CLAUDE.md contains all original content + the two appended lines.
```

### After global setup

1. Open a new terminal for PATH changes to take effect.
2. In Claude Code: `/doctor` then `/plugins` — should show superpowers.
3. Install agent plugins inside Claude Code:
   ```
   /plugin marketplace add obra/superpowers-marketplace
   /plugin install superpowers@superpowers-marketplace
   ```
4. Verify `~/.claude/machina/rules.md` shows `https://github.com/darkyzowo/machina`.

---

## Setup: per-project (run once per repo)

```bash
cd your-project
git init
# copy machina scaffold files into the project root
cp -r /path/to/machina/. .
make bootstrap
```

Then on GitHub: **Settings → Branches → Branch protection → main** — require
`secret-scan` and `verify` checks before merge. Without this, CI is advisory.

spec-kit init (standard+ profiles):
```bash
specify init . --integration claude    # or: codex | cursor | copilot
```

---

## Driving the workflow

**lean:** Just start building. Superpowers triggers TDD, brainstorm, and code
review automatically. Follow `AGENT_INSTRUCTIONS.md`.

**standard+:** Run the spec loop first:
```
/speckit.constitution  → governing principles
/speckit.specify       → exact requirements and user stories
/speckit.plan          → map to tech stack
/brainstorm            → human validation gate (required)
/speckit.tasks         → verifiable micro-tasks
```
Dispatch into isolated git worktrees. Red → green → refactor per task.
Stop at 5 passes. Run `/security-review` before merging any branch.

---

## Troubleshooting

**`specify` or `pre-commit` not found after install**
Run `uv tool update-shell`, then open a new terminal or source your shell rc
(`~/.zshrc`, `~/.bashrc`, `~/.config/fish/config.fish`).

**`claude-mem start` fails**
Port conflict (default 37777). Try: `CLAUDE_MEM_PORT=37778 claude-mem start`.

**Agent proposes to overwrite my CLAUDE.md**
Reject it. The correct behaviour is append-only. Re-read Phase 3 of the
one-shot prompt — "append-only, NEVER overwrite" is explicit.
Use `global-setup.sh` instead to handle this automatically.

**`bootstrap.sh` refuses: "VERIFY pins"**
You blanked a version pin. Resolve it in `orchestrator_config.yaml`.
The gate is deliberate — unpinned tools + autonomous loop = threat model.

**`bootstrap.sh` refuses: "do not run as root"**
Run as your normal user, without sudo.

**`pre-commit install` fails**
Run `git init` first. pre-commit requires a git repository.

**Agent uses tools outside its profile**
`.agent-profile` may be stale. Run `make profile` to re-detect.

**CI dep audit fails**
A dependency has a known vulnerability. Fix it, re-push. Do not suppress.

**gitleaks blocks a commit**
Remove the secret from the file. Use `.env` (gitignored). Rotate the credential.

---

## Verification

All tools verified to exist at time of authoring (June 2026):

| Tool | Source | Version | Licence |
|---|---|---|---|
| superpowers | obra/superpowers | 5.1.0 | MIT |
| graphify | safishamsi/graphify | v3 | MIT |
| claude-mem | thedotmack/claude-mem | 12.3.8 | — |
| caveman | JuliusBrussee/caveman | current | MIT |
| spec-kit | github/spec-kit (Specify CLI) | v0.10.2 | MIT |
| Skiper UI | skiper-ui.com | current | — |
| Aceternity UI | ui.aceternity.com | current | MIT |

Not independently verified: `nextlevelbuilder/ui-ux-pro-max-skill`.
Karpathy principles are encoded directly in `AGENT_INSTRUCTIONS.md`.

> Re-verify currency of all pins before a production run.
> `make verify` is the check; green CI is the definition of done.
