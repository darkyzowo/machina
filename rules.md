# Machina Harness Spec v4.0 (legacy alias — canonical: harness.md)
# Source: ~/.claude/machina/harness.md — update via: make update

---

## §0 — Hard limits (Tier A/B — mechanically enforced)

| Control | Tier | Mechanism |
|---------|------|-----------|
| Pass ceiling (5 edits) | A | `pass-ceiling.js` blocks Edit/Write |
| Phase gates (rigor mode) | A | `phase-gate.js` blocks writes by phase |
| Secret patterns | A | `secret-guard.js` blocks writes (all modes) |
| Done signal | B | Verifier artifacts in `.machina/verifiers/` required to advance |
| TDD RED→GREEN | A | `red` phase blocks impl; `green` requires `red.txt` exit≠0 |

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
- Commands: `/machina status` | `next` | `reset`

**One phase per turn:** red phase allows test files only; green allows impl after RED artifact.

---

## §3 — Security (Tier A at design time)

Before security-relevant implementation in **rigor** mode:

1. Write `specs/<feature>/security.md` with `## Abuse cases` (or root `SECURITY_SPEC.md`)
2. `phase-gate.js` blocks impl until artifact exists

**Ship mode:** abbreviated — network/auth surface still needs abuse cases in SECURITY_SPEC.md.

Security fixes outside task scope → note and defer (§4). Never inline-patch.

---

## §4 — Surgical changes (always on — Tier C advisory, ship default)

- Edit only targeted logic for the current task
- No drive-by format, rename, or speculative abstractions
- One logical concern per commit

---

## §5 — Qualitative UX gate (rigor + UI only — Tier B)

After CI passes for UI work: `agent-browser` or browser MCP evidence in `.machina/verifiers/<task>/ux.txt`.

`SKIPPED` must be logged in state with reason — SKIPPED ≠ PASSED.

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
