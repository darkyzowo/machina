Switch this session to **Project mode**.

1. Use the Bash tool to get the rules path: `node -e "console.log(require('os').homedir() + '/.claude/machina/rules.md')"`
2. Use the Read tool to read that file — loads the full machina ruleset into context.
3. Apply sections by tier based on `.agent-profile` in the current working directory:
   - `lean` (or absent) → §0 §1 §2 §3 §4
   - `standard` → §0 §1 §2 §3 §4 §5
   - `full` → §0 §1 §2 §3 §4 §5 §6
   §0 (pass ceiling + done-signal rule) is always active regardless of tier.
4. Confirm with: "Project mode active. Machina rules loaded."

This switch is **session-only**. To make project mode permanent for a directory, run:
```bash
bash "$(node -e "process.stdout.write(require('os').homedir())")"/.claude/machina/scripts/detect-profile.sh
```
Or manually: `echo "standard" > .agent-profile`
