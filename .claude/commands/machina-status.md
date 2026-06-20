---
description: Show Machina harness state — phase, rigor, task, missing verifiers.
allowed-tools: Read, Bash, Grep, Glob
---

# /machina status

Print the current Machina harness state for this project.

1. Read `.machina/state.json` and `.machina/rigor` if present.
2. List `.machina/verifiers/<current_task>/` artifacts (red.txt, green.txt, ci.txt, ux.txt).
3. Report:
   - rigor (ship | rigor)
   - phase
   - current_task (+ current_task_body from state if set)
   - open tasks: first unchecked line from `specs/**/tasks.md` (if any)
   - pass_count / 5
   - missing verifier artifacts for current phase
4. If `.machina/` missing, tell user to run `make bootstrap`.

End with a one-line summary: `Machina: <rigor> | phase=<phase> | task=<task> | pass=<n>/5`
