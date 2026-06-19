---
description: Switch to ship mode — surgical edits + security floors only.
allowed-tools: Read, Write, Edit
---

# /machina ship

Switch this session to **ship** mode (fast path).

1. Write `ship` to `.machina/rigor`
2. Update `.machina/state.json`: set `rigor` to `ship`, `phase` to `orient`

**Active:** surgical changes (§4), secret-guard, dep-audit expectation.
**Suspended:** TDD phases, UX gate, spec-kit phase gates.

Confirm: `Ship mode active. Security floors on; process phases suspended.`

Alias: `/casual` (deprecated — use `/machina ship`).
