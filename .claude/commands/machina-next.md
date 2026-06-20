---
description: Advance harness phase mechanically when verifier artifacts satisfy the gate.
allowed-tools: Read, Bash
---

# /machina next

Advance the Machina phase **mechanically** — do not guess gate status.

Run from project root:

```bash
node "$HOME/.claude/hooks/machina-advance.js"
```

To log UX gate as SKIPPED (requires reason; SKIPPED ≠ PASSED):

```bash
node "$HOME/.claude/hooks/machina-advance.js" --skip-ux "no browser / backend-only change"
```

On success, print the script output to the user.
On failure (exit 1), show stderr and list missing artifacts from `/machina status`.

## Phase transitions (enforced by script)

| From | Requires | To |
|------|----------|-----|
| orient | — | red (if specs ready) or speckit_specify / security_spec |
| speckit_specify | spec.md | security_spec |
| security_spec | security.md + Abuse cases | speckit_plan or speckit_tasks |
| speckit_plan | plan.md | speckit_tasks |
| speckit_tasks | tasks.md | red (auto-assigns `current_task` from first `- [ ]`) |
| red | red.txt exit≠0 | green |
| green | green.txt exit=0 | refactor |
| refactor | — | ci_gates |
| ci_gates | ci.txt exit=0 | ux_gate (if UI) or task_complete |
| ux_gate | ux.txt exit=0 or logged SKIPPED | task_complete |
| task_complete | — | red (next `- [ ]` task) or orient (all done; prior task → `[x]`) |

After advancing, suggest the **next concrete action** (e.g. run tests, `/security-spec`, `/machina ux`).
