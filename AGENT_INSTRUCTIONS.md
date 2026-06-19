# AGENT_INSTRUCTIONS.md

Project-specific overrides for Machina v3. The harness runtime is mechanical —
see `.machina/state.json` and hooks in `~/.claude/hooks/`.

Canonical spec: `harness.md` (global: `~/.claude/machina/harness.md`).

---

## Hard limits (Tier A — hooks enforce these)

- **Done = verifiable** — external tool output only.
- **5-pass ceiling** — `/machina reset` after human review.
- **No config mutation** — never edit `~/.claude`, `~/.cursor`, etc.
- **Secret guard always on** — even in ship mode.

---

## Rigor dial (user-facing)

| Mode | Command |
|------|---------|
| ship (default) | `/machina ship` |
| rigor (full loop) | `/machina rigor` |

`.agent-profile` (lean/standard/full) controls optional tool install only — `make profile-setup`.

---

## Before coding

State assumptions. HALT only when deliverable format, target location, or spec
interpretation is genuinely incompatible.

**Security spec (rigor mode):** `phase-gate.js` blocks impl until
`specs/<feature>/security.md` includes `## Abuse cases`. Use `/security-spec`.

**Surgical changes (always):** edit only task scope. Security fixes outside scope → note, defer.

---

## TDD (rigor mode — Tier A via phase-gate)

1. `/machina rigor` → phase `red` — test files only
2. Run tests → verifier captures `red.txt` with exit ≠ 0
3. Phase `green` — impl allowed after RED artifact
4. `/machina next` — run `node ~/.claude/hooks/machina-advance.js` (mechanical; do not guess gates)

---

## UX / frontend (rigor + UI)

When `ui_touched` is set, use `/machina ux` for the skill map:

brainstorming → ui-ux-pro-max → implement → playwright (if present) → agent-browser evidence → `/machina next`

SKIPPED UX requires `--skip-ux "reason"` on advance script.

## Pre-merge (rigor)

- CI green (Tier A only with branch protection)
- Security spec or explicit none
- UX gate passed (not SKIPPED)
- `/security-review` read-only
- gitleaks + dep audit clean

---

## Profile tools

Read `.agent-profile`. Do not call tools outside your tier:

| Profile | Tools |
|---------|-------|
| lean | CI + superpowers |
| standard | + spec-kit |
| full | + claude-mem + graphify (opt-in install) |

**spec-kit (standard+):** `/speckit.constitution` → `/speckit.specify` → `/security-spec` → `/speckit.plan` → `/speckit.tasks`
