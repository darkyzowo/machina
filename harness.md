# Machina Harness Spec v4.0
# Source: ~/.claude/machina/harness.md — update via: make update

---

## §0 — Two tiers (v4)

| Tier | Path | Default | What enforces |
|------|------|---------|---------------|
| **Global** | `~/.claude/.machina/` | ship, `scope: global` | `secret-guard.js` only |
| **Project** | `repo/.machina/` | ship → `/machina rigor` | full harness when rigor |

Never create `$HOME/.machina/` — global state lives under `~/.claude/.machina/` only.

---

## §0b — Hard limits (Tier A/B — scope varies)

| Control | Tier | Scope | Mechanism |
|---------|------|-------|-----------|
| Secret patterns | A | global + project | `secret-guard.js` |
| Pass ceiling (5 edits) | A | project + rigor | `pass-ceiling.js` |
| Phase gates | A | project + rigor | `phase-gate.js` |
| Ship security floor | A | project + ship | sensitive paths need security spec |
| Done signal | B | project + rigor | verifier artifacts required to advance |
| TDD RED→GREEN | A | project + rigor | red blocks impl; green needs `red.txt` exit≠0 |

**Done = verifiable.** External tool output only — never self-grade.

---

## §1 — Rigor dial (user-facing)

| Mode | Command | Behavior |
|------|---------|----------|
| **ship** | `/machina ship` | Surgical edits + security floors. No TDD/UX/spec phases. |
| **rigor** | `/machina rigor` | Full loop: spec-kit → security → RED → GREEN → CI → UX |

Persist: `echo rigor > .machina/rigor` or `echo ship > .machina/rigor`

Internal `.agent-profile` (lean/standard/full) controls optional tool install only — run `make profile-setup`.

---

## §2 — Harness state machine (rigor mode)

```
orient → speckit_specify → security_spec → speckit_plan → speckit_tasks → red → green → refactor → ci_gates → ux_gate → task_complete
```

- State: `.machina/state.json`
- Proof: `.machina/verifiers/<task>/red.txt`, `green.txt`, `ci.txt`, `ux.txt`
- **Tasks:** `current_task` auto-assigned from first `- [ ]` line in `specs/**/tasks.md` when entering `red` (spec-kit `T001` IDs preferred). Completed tasks marked `[x]` on `task_complete` → next.
- Commands: `/machina status` | `next` | `reset`

**One phase per turn:** red phase allows test files only; green allows impl after RED artifact.

---

## §3 — Security (Tier A at design time)

Before security-relevant implementation in **rigor** mode:

1. Write `specs/<feature>/security.md` with `## Abuse cases` (or root `SECURITY_SPEC.md`)
2. `phase-gate.js` blocks impl until artifact exists

**Ship mode:** abbreviated — network/auth/API surface still needs abuse cases (`/security-spec`). Sensitive paths (`api/`, `auth/`, `middleware`, `routes/`, `server/`) are blocked until a security spec exists, even without `specs/`.

Security fixes outside task scope → note and defer (§4). Never inline-patch.

---

## §4 — Surgical changes (always on — Tier C advisory, ship default)

- Edit only targeted logic for the current task
- No drive-by format, rename, or speculative abstractions
- One logical concern per commit

---

## §5 — Qualitative UX gate (rigor + UI only — Tier B)

After CI passes for UI work: `agent-browser` or Playwright evidence in `.machina/verifiers/<task>/ux.txt`.

**UI detection:** editing UI paths (`.tsx`, `components/`, pages) sets `ui_touched` in state automatically.

**Skill map** (use `/machina ux`):

| Step | Skill | When |
|------|-------|------|
| Design exploration | `brainstorming` (superpowers) | New screens, flows, IA |
| Visual polish | `ui-ux-pro-max` | Typography, spacing, a11y, design system |
| E2E | `playwright` | Regression on critical UI paths |
| Evidence | `agent-browser` | Capture ux.txt verifier artifact |

`SKIPPED` must be logged via `/machina next --skip-ux "reason"` — SKIPPED ≠ PASSED.

---

## §6 — Pre-merge (rigor — Tier A in CI with branch protection)

- Tests, lint, typecheck, build exit 0
- Security spec exists or scope marked none
- UX gate passed (not SKIPPED)
- `/security-review` read-only audit
- gitleaks + dep audit clean

---

## §7 — Memory tools (full profile only — optional)

Install via `make profile-setup PROFILE=full`. claude-mem + graphify are **not** installed by default.

Query pattern: `search` → `timeline` → `get_observations`. Never load full context on first query.
