# CLAUDE.md

Read `AGENT_INSTRUCTIONS.md` for project overrides. Session bootstrap only.

## Machina v3 harness

State: `.machina/state.json` | Commands: `/machina status` | `rigor` | `ship` | `next` | `reset`

| Rigor | Behavior |
|-------|----------|
| ship (default) | Surgical edits + security floors |
| rigor | Full loop — phase-gate blocks impl in RED |

Full spec on demand: `/machina rules`

## Internal profile (tool install only)

Read `.agent-profile` — if absent, assume `lean`. Run `make profile-setup` for tools.

## Hard limits

- External verification before done — not self-grade.
- 5 edits then halt — `/machina reset` after human review.
- Security spec before security-relevant impl (rigor mode — mechanically gated).
- Never install tools or edit user configs from the agent.
