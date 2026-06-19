# Machina

**Claude Code loop harness — mechanically enforced engineering discipline.**

Machina v3 is a **harness runtime**, not a rules dump. Hooks gate tool use by phase;
verifier artifacts in `.machina/verifiers/` prove progress. Two user-facing modes:

| Rigor | Command | What runs |
|-------|---------|-----------|
| **ship** | `/machina ship` | Surgical edits + security floors (default) |
| **rigor** | `/machina rigor` | spec-kit → security → RED → GREEN → CI → UX |

> **CI is Tier A only with branch protection.** Without required status checks, CI is advisory.

---

## What Machina does NOT do

- Does **not** route models in single-agent Claude Code sessions
- Does **not** guarantee prose rules are followed (Tier C is advisory until gated)
- Does **not** install claude-mem, graphify, or spec-kit by default (`make profile-setup`)
- Does **not** auto-start background workers (no claude-mem worker on setup)
- Does **not** extend Cursor integration (frozen at v2.5 — see [Cursor (parked)](#cursor-parked))

---

## Key features (with enforcement tier)

| Feature | Tier | Mechanism |
|---------|------|-----------|
| Phase gates (rigor) | **A** | `phase-gate.js` blocks Edit/Write by phase |
| CI / UX gates (rigor) | **A** | `ci_gates` / `ux_gate` block impl until verifier artifacts |
| Mechanical advance | **A** | `machina-advance.js` via `/machina next` |
| Pass ceiling (5 edits) | **A** | `pass-ceiling.js` blocks at 5 |
| Secret patterns | **A** | `secret-guard.js` blocks writes (all modes) |
| Verifier capture | **B** | `verifier-capture.js` on Bash → `.machina/verifiers/` |
| TDD RED→GREEN | **A** | red phase = tests only; green needs `red.txt` exit≠0 |
| Security abuse cases | **A** (CI) | `check-spec-security.sh` + phase gate locally |
| UX gate | **B** | Evidence in `ux.txt` or SKIPPED in state |
| Surgical changes | C | Advisory — ship mode default |
| Telemetry | B | `.machina/telemetry.jsonl` — `make report` |

---

## Quick start (Claude Code)

**Windows:** use **WSL or Git Bash** — not plain PowerShell.

```bash
git clone https://github.com/darkyzowo/machina
cd machina

make global-setup      # once per machine — hooks only
make bootstrap         # once per project — .machina/ scaffold
make profile-setup     # tools for .agent-profile tier
claude
```

Inside Claude Code:

```
/machina rigor         # full harness loop
/machina status        # phase, task, verifiers
/machina ship          # fast path
```

Optional: `/plugin marketplace add obra/superpowers-marketplace` + install superpowers.

---

## Architecture

```
~/.claude/
  hooks/
    harness-init.js      SessionStart — slim context (~5 lines)
    phase-gate.js        PreToolUse — Tier A phase enforcement
    pass-ceiling.js      PreToolUse — Tier A edit limit
    secret-guard.js      PreToolUse — Tier A secrets
    verifier-capture.js  PostToolUse Bash — verifier artifacts
  machina/harness.md     Canonical spec (on demand: /machina rules)
  commands/machina-*.md  /machina status | rigor | ship | next | reset

your-project/
  .machina/
    state.json           phase, rigor, task, pass_count
    rigor                ship | rigor
    verifiers/<task>/    red.txt, green.txt, ci.txt, ux.txt
    telemetry.jsonl      harness events (make report)
  .agent-profile         internal: lean | standard | full (tool install)
  specs/**/              spec-kit artifacts (rigor mode)
```

### Rigor mode state machine

```
orient → speckit_specify → security_spec → speckit_plan → speckit_tasks
  → red → green → refactor → ci_gates → ux_gate → task_complete
```

---

## Setup details

### global-setup (hooks only)

Installs harness hooks and `/machina` commands. Does **not** install claude-mem,
graphify, karpathy skills, or start background workers.

### profile-setup (lazy tools)

```bash
make profile-setup                  # uses .agent-profile
make profile-setup PROFILE=full     # + claude-mem + graphify
```

| Internal profile | Tools installed |
|------------------|-----------------|
| lean | agent-browser |
| standard | + specify-cli |
| full | + claude-mem + graphify (manual start) |

### Per-project bootstrap

```bash
cd your-project
cp /path/to/machina/CLAUDE.md .
bash /path/to/machina/scripts/detect-profile.sh .
make -C /path/to/machina bootstrap
```

---

## Commands

| Command | Purpose |
|---------|---------|
| `/machina status` | Phase, rigor, task, missing verifiers |
| `/machina rigor` | Full harness loop |
| `/machina ship` | Fast path (default) |
| `/machina next` | Advance phase when gates satisfied |
| `/machina ux` | UX gate workflow + skill map |
| `/machina reset` | Reset pass counter after human review |
| `/machina rules` | Load full harness.md |
| `/security-spec` | Create security spec (rigor gate) |
| `/security-review` | Read-only security audit |

Legacy aliases: `/project` → rigor, `/casual` → ship.

---

## Makefile targets

```bash
make global-setup    # ~/.claude hooks
make bootstrap       # .machina/ per project
make profile-setup   # lazy tool install
make verify          # fail-loud preflight
make report          # telemetry summary
make harness-test    # acceptance tests
make check-pins      # PINNED vs LATEST
make update          # sync installed files from repo
```

---

## Benchmarks

See [benchmarks/README.md](benchmarks/README.md) for vanilla vs Machina rigor methodology.

---

## Cursor (parked)

**Status:** Frozen at v2.5. Claude Code is the supported harness. Cursor templates
are maintained for correctness but not extended.

```bash
bash scripts/install-cursor.sh /path/to/project   # legacy
```

See `templates/cursor/README.md`.

---

## File precedence

| Priority | File | Purpose |
|----------|------|---------|
| 1 | `AGENT_INSTRUCTIONS.md` | Project overrides (`OVERRIDE:` prefix) |
| 2 | `CLAUDE.md` | Session bootstrap |
| 3 | `~/.claude/machina/harness.md` | Global harness spec |

---

## Requirements

- Node.js 24+ (for agent-browser UX gate)
- git, bash
- uv (for spec-kit on standard+ profile)
- Windows: WSL or Git Bash

---

## Changelog

### v3.2.0 — Harness loop completion

- **Mechanical `/machina next`:** `machina-advance.js` checks artifacts and advances phase
- **CI + UX gates enforced:** `ci_gates` / `ux_gate` / `task_complete` block impl writes in rigor mode
- **Ship security floor:** sensitive paths (`api/`, `auth/`, etc.) require security spec
- **UI auto-detect:** `ui_touched` flag when editing frontend files
- **`/machina ux`:** skill map (brainstorming → ui-ux-pro-max → playwright → agent-browser)
- **Verifier capture:** pnpm/yarn/playwright/cargo/go test patterns; auto-advance after CI/UX

### v3.0.0 — Harness runtime

- **Loop runtime:** `phase-gate.js`, `.machina/state.json`, verifier artifacts
- **Rigor dial:** ship vs rigor replaces project/casual × profile confusion
- **Lazy setup:** global-setup = hooks only; `profile-setup.sh` for tools
- **Quiet terminal:** no statusMessage on Edit/Write; removed done-signal hot path
- **Telemetry:** `.machina/telemetry.jsonl` + `make report`
- **Security:** secret-guard.js + CI security job + spec abuse-cases gate
- **Cursor parked;** model routing demoted to aspirational

### v2.5.0 and earlier

See git history for security-spec checkpoint, Cursor integration, mode system.
