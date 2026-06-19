---
description: Switch to rigor mode — full harness loop (spec → RED → GREEN → CI → UX).
allowed-tools: Read, Write, Edit, Bash
---

# /machina rigor

Switch this session to **rigor** mode (full harness loop).

1. Write `rigor` to `.machina/rigor`
2. Update `.machina/state.json`: set `rigor` to `rigor`
3. If phase is `orient`, suggest next phase based on project:
   - No `specs/**/spec.md` → `speckit_specify` (run `/speckit.specify`)
   - Has spec, no security.md with Abuse cases → `security_spec` (run `/security-spec`)
   - Has tasks → set `current_task` from first unchecked item in `specs/**/tasks.md`, phase `red`

Confirm: `Rigor mode active. Full loop enforced. Phase gates block impl in red.`

Alias: `/project` (deprecated — use `/machina rigor`).
