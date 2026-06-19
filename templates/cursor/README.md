# Machina Cursor integration (template)

## Status

**Frozen at v2.5.0.** Claude Code is the supported Machina v3 harness.
Cursor integration is maintained for correctness but **not extended**.

## Install (legacy)

Project-level Cursor rules and hooks. Installed by:

```bash
bash /path/to/machina/scripts/install-cursor.sh [TARGET_DIR]
```

**Does not modify** `~/.cursor`, `~/.claude`, or any global agent config.

## Contents

| Path | Purpose |
|------|---------|
| `.cursor/rules/machina-integration.mdc` | Profile-gated state machine, security spec, TDD, UX gate |
| `.cursor/hooks.json` | sessionStart + pass ceiling + done-signal |
| `.cursor/hooks/machina-session-init.js` | Profile injection at session start (port of `mode-init.js`) |
| `.cursor/hooks/machina-pass-ceiling.js` | Blocks `Write`/`StrReplace` at 5 passes (§0) |
| `.cursor/hooks/machina-done-signal.js` | Reminds agent to verify externally |
| `.cursor/hooks/machina-reset.js` | Reset after human review |
| `.machina/state.json` | Phase, security spec, UX gate, and pass tracking across agent turns |

## After install

1. Run `bash /path/to/machina/scripts/detect-profile.sh .` in the project root if `.agent-profile` is missing.
2. **Open the project as the Cursor workspace root** (File → Open Folder).
3. Reload window so `.cursor/hooks.json` loads.
4. Enable `cursor-ide-browser` MCP for the UX gate.
5. Standard/full: `specify init . --integration cursor`
6. Security-relevant work: create `specs/<feature>/security.md` or `SECURITY_SPEC.md` before implementation.

## Verify integration

In a new Agent chat, ask: *What is my active Machina profile and current phase?*

Expected: profile from `.agent-profile`, phase `orient`, hooks active.

## Reset pass ceiling

```bash
node .cursor/hooks/machina-reset.js
```
