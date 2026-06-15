Switch this session to **Project mode**.

1. Use the Bash tool to get the rules path: `node -e "console.log(require('os').homedir() + '/.claude/machina/rules.md')"`
2. Use the Read tool to read that file — loads the full machina ruleset into context.
3. Apply all sections (§0–§6) based on `.agent-profile` in the current working directory. If none present, apply lean profile (§1–§4).
4. Confirm with: "Project mode active. Machina rules loaded."

This switch is **session-only**. To make project mode permanent for a directory, run:
```bash
bash "$(node -e "process.stdout.write(require('os').homedir())")"/.claude/machina/scripts/detect-profile.sh
```
Or manually: `echo "standard" > .agent-profile`
