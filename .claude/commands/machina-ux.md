---
description: UX gate workflow — design skills, browser verification, artifact capture for UI work.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# /machina ux

Run the **qualitative UX gate** when `ui_touched` is true (rigor mode, phase `ux_gate` or approaching it).

## When to use

- After CI passes and UI files were edited (`.tsx`, `.vue`, `components/`, pages)
- Before marking a UI task complete
- HUD shows `ui` flag or phase is `ux_gate`

## Skill map (use in order)

| Step | Skill / tool | Purpose |
|------|----------------|---------|
| 1 | **brainstorming** (superpowers) | Explore layout/flow before pixel work — mandatory for new UI surfaces |
| 2 | **ui-ux-pro-max** | Typography, spacing, color, accessibility, design-system alignment |
| 3 | Implement | Surgical component changes only |
| 4 | **playwright** (if e2e exists) | Automated UI regression |
| 5 | **agent-browser** CLI | Capture visual/functional evidence for Machina verifier |

Install UX tooling: `make profile-setup` (installs agent-browser on all profiles).

## Verification (required for rigor)

Run browser evidence so `verifier-capture.js` writes `.machina/verifiers/<task>/ux.txt`:

```bash
agent-browser open http://localhost:3000/your-page
agent-browser snapshot
# optional: agent-browser screenshot
```

Or Playwright:

```bash
npx playwright test tests/ui-your-feature.spec.ts
```

Then:

```bash
node "$HOME/.claude/hooks/machina-advance.js"
```

## Skip (backend-only / no browser)

Only when **no user-visible UI** changed:

```bash
node "$HOME/.claude/hooks/machina-advance.js" --skip-ux "backend-only; no UI surface"
```

SKIPPED is logged in state — it does **not** count as PASSED for pre-merge checklist.

## Checklist before UX pass

- [ ] Loading, empty, and error states handled
- [ ] Keyboard focus visible; interactive targets ≥44px where practical
- [ ] No placeholder-only copy on production surfaces
- [ ] Responsive at mobile + desktop widths
- [ ] Evidence captured in ux.txt (exit 0)

End with: `UX gate: <passed|SKIPPED|pending> — artifact: .machina/verifiers/<task>/ux.txt`
