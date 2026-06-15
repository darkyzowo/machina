# AGENTS.md

Cross-agent entry point (Codex, Cursor, Gemini CLI, OpenCode).
Claude Code reads `CLAUDE.md`; all other agents read this file.
Both point to the same canonical source.

## Active profile

Read `.agent-profile` (one word: `lean` / `standard` / `full`).
Use only tools installed for your active profile. If absent, assume `lean`.

## Rules

Follow `AGENT_INSTRUCTIONS.md` exactly — it is the single source of truth.

## Hard limits

- TDD: red → green → refactor. Surgical changes. HALT on ambiguity.
- Never install tooling, route models, or edit user configs.
- 5-pass recursion ceiling, then mandatory human review.
- Merges gated: CI + dep audit + secret scan.

## Agent-specific notes

- **Codex:** slash commands use `$` prefix (e.g. `$brainstorm`, not `/brainstorm`).
- **Cursor:** `.cursorrules` files are audited read-only; never auto-edited.
- **Gemini CLI / OpenCode:** `/speckit.*` commands require spec-kit init
  (`specify init . --integration <agent>`).
