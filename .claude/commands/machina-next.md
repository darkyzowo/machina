---
description: Advance harness phase when verifier artifacts satisfy the gate.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# /machina next

Advance the Machina phase when gates are satisfied.

Read `.machina/state.json` and verifier artifacts. Apply transitions:

| Current phase | Advance when | Next phase |
|---------------|--------------|------------|
| orient | task identified | speckit_specify (rigor) or red (small task) |
| speckit_specify | specs/**/spec.md exists | security_spec |
| security_spec | security.md has ## Abuse cases | speckit_plan |
| speckit_plan | plan.md exists | speckit_tasks |
| speckit_tasks | tasks.md exists | red |
| red | verifiers/.../red.txt exit≠0 | green |
| green | verifiers/.../green.txt exit=0 | refactor |
| refactor | (manual) | ci_gates |
| ci_gates | npm test/lint/typecheck/build exit 0 | ux_gate (if UI) or task_complete |
| ux_gate | ux.txt or SKIPPED logged in state | task_complete |
| task_complete | — | orient (next task) |

Update `.machina/state.json` with new phase. Log transition via note in response.

If gate not satisfied, HALT and list what artifact is missing.
