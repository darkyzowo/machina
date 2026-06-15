# CLAUDE.md

Read `AGENT_INSTRUCTIONS.md` for the full behavioural spec. This file is
a session bootstrap only — keep it small, it loads every time.

## Active profile

Read `.agent-profile` (one word). If absent, assume `lean` and say so.

| Profile    | Tools available                                          |
|------------|----------------------------------------------------------|
| `lean`     | CI + superpowers                                         |
| `standard` | + spec-kit (`/speckit.*` commands) + caveman             |
| `full`     | + claude-mem (memory MCP) + graphify (code graph MCP)    |

Do not use tools outside your active profile.

## Hard limits (repeated because they are load-bearing)

- TDD mandatory: failing test first → wait for real red → minimal code to green → refactor.
- Surgical changes only. State assumptions. HALT on ambiguity.
- Never install tools, route models, or touch user configs.
- Stop at 5 passes. Every merge gated by CI + dep audit + secret scan.
