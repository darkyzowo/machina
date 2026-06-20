---
description: Switch to rigor mode — full harness loop (spec → RED → GREEN → CI → UX).
allowed-tools: Read, Write, Edit, Bash
---

# /machina rigor

Switch this session to **rigor** mode (full harness loop).

1. Write `rigor` to `.machina/rigor`
2. Update `.machina/state.json`: set `rigor` to `rigor`
3. Suggest next action from project state:
   - No `specs/**/spec.md` → run `/speckit.specify`, phase `speckit_specify`
   - Missing security abuse cases → `/security-spec`, phase `security_spec`
   - Specs ready (security + plan + tasks) → run `/machina next` (assigns `T001`… from tasks.md → `red`)

**Task assignment is mechanical** when advancing to `red` — first unchecked `- [ ]` line in `specs/**/tasks.md` becomes `current_task` and verifier directory name.

Confirm: `Rigor mode active. Full loop enforced. Use /machina next to advance.`

Alias: `/project` (deprecated — use `/machina rigor`).
