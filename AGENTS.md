# AGENTS.md

Cross-agent entry point. **Machina v4 targets Claude Code** as the primary harness.

## Claude Code

```bash
make global-setup && make bootstrap && make profile-setup
```

Harness: `.machina/state.json` + `~/.claude/hooks/`. Commands: `/machina rigor` | `ship` | `status`.

Read `AGENT_INSTRUCTIONS.md` and `harness.md` for behavioral spec.

## Active profile (internal — tool install only)

Read `.agent-profile` (`lean` / `standard` / `full`). User-facing control is the **rigor dial**:
`/machina ship` (fast) or `/machina rigor` (full loop).

## Cursor / Codex / others

Cursor integration is **parked** at v2.5 — see `templates/cursor/README.md`.
Codex: use `$` prefix for slash commands per tool conventions.

## Hard limits

- External verification before done
- 5-pass ceiling — `/machina reset` after human review
- Security spec gated in rigor mode
- Never install tooling or edit user configs from the agent
