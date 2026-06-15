# Machina Agent Instructions
# Version: 2.0.0 — Post-stress-test hardening
# Source: ~/.claude/machina/rules.md
# Do not edit directly — update rules.md in the repo and re-run global-setup.sh

---

## §0 — Read Your Profile

Read `.agent-profile` from the project root. Apply rules for your tier:

| Profile | Active sections |
|---------|----------------|
| lean    | §1 §2 §3 §4    |
| standard | §1 §2 §3 §4 §5 |
| full    | §1 §2 §3 §4 §5 §6 |

**Pass ceiling:** 5 recursive passes on any single task before halting for
human review. No exceptions.

**Done signal rule:** You are forbidden from passing your own output.
All done signals must come from an external tool: compiler, linter,
test runner, or browser. "It looks right" is not a done signal.

---

## §1 — Before Writing Any Code

### 1.1 State assumptions
Explicitly state all assumptions before starting any task.
On any ambiguity: HALT and ask. Do not guess. Do not proceed with assumed intent.

### 1.2 Layout Architecture Checkpoint *(multi-view apps only)*

Before writing any component in an app with more than one view:

1. State the navigation model you will use:
   **page-swap / sidebar / tabs / modal**
2. Justify your choice in one sentence
3. Default rule: if the spec is silent on layout, choose the model that
   keeps the most user context visible at all times
4. Commit to this model — do not change navigation architecture after the
   first component is written without explicit human approval

### 1.3 Scaffold Hygiene Audit *(scaffolded projects only)*

After any scaffold command (Vite, CRA, Next.js, Remix, etc.) and
**before writing any feature code**:

1. Read every file in `src/` that was generated (App.tsx, main.tsx, *.css)
2. Read `index.html` for global scripts, meta tags, and link elements
3. Read all generated CSS files: `index.css`, `App.css`, `globals.css`
4. Identify and surgically remove:
   - `color-scheme` declarations (causes invisible inputs on dark OS)
   - Global `text-align: center` on `#root`, `body`, or `html`
   - Generated demo class names that may bleed into new styles (`.card`, `.counter`, etc.)
   - Any placeholder content (logos, default copy, example buttons)
5. Run `npm run dev` — confirm the page renders as a visually clean blank slate
6. **If it does not render clean: fix scaffold output before writing any features**
   A broken starting point compounds into broken features.

---

## §2 — TDD Protocol

### 2.1 Hard rules
- Write tests before implementation for all logic
- You are forbidden from calling a task done based on your own judgement
- Done signals come from tools only

### 2.2 Bifurcated TDD

**Logic TDD** — use for: stores, utilities, pure functions, API handlers,
data transformations, business logic

1. Write the failing test first — assert the expected output
2. Run the test suite — confirm **RED** before proceeding
3. Write the minimal implementation to pass — no more
4. Run again — confirm **GREEN**
5. Refactor only if tests stay green throughout

**Component Behavioral TDD** — use for: any React/UI component

1. Read the spec for user-visible behaviour ("user clicks X, sees Y appear")
2. Write test assertions against those user actions using the spec as the contract
   - ✅ `expect(screen.getByRole('button', { name: 'New Trip' })).toBeInTheDocument()`
   - ✅ `expect(screen.getByText('My Trip')).toBeVisible()` after user creates a trip
   - ❌ `expect(wrapper.state('isOpen')).toBe(true)` — this is an implementation detail
3. Run the tests — confirm **RED** (the component does not exist yet)
4. Build the component to make the tests **GREEN**
5. **Never write the component first and the tests after** — that is not TDD,
   that is test theater and it produces no discipline

### 2.3 Systematic debugging
On any test failure:
1. State your hypothesis in one sentence before touching any code
2. Add the minimum instrumentation (log/assertion) to confirm or deny it
3. Fix the isolated cause
4. Run the full suite — confirm green before advancing
5. After 3 failed hypotheses on the same failure: **HALT and report to human**
   Do not continue guessing. The human needs to know.

---

## §3 — Qualitative UX Gate *(all profiles — UI features only)*

After tests pass for any feature with a UI surface, this gate is **mandatory**.
"Tests pass" is necessary but not sufficient for UI work.

### 3.1 Steps

1. Ensure the dev server is running: `npm run dev`
2. Open the app: `agent-browser open http://localhost:5173`
3. Take an accessibility snapshot: `agent-browser snapshot`
4. Navigate to the feature you just built
5. Self-attest the checklist below

### 3.2 Checklist — all items must pass before marking ✅

- [ ] All text is readable against its background in **light mode** (OS setting)
- [ ] All text is readable against its background in **dark mode** (OS setting)
- [ ] Every interactive element (button, link, toggle) has a **visible, descriptive label**
- [ ] Every input has a **visible border** and appropriate placeholder text
- [ ] The layout renders without horizontal overflow or clipping at **375px viewport width**
- [ ] The primary user flow for this feature completes without **console errors**
- [ ] No UI element is invisible, overlapping, or unreachable via keyboard

### 3.3 On failure
Fix before marking done. Do not proceed to the next feature with a broken UI.
Log the failure and the fix in your RESULTS.md if one exists.

---

## §4 — Surgical Changes

- Modify only the targeted logic for the current task
- Do not reformat adjacent code — formatting changes hide real diffs
- Do not "clean up" unrelated files during a feature branch
- Do not add future-proofing, abstractions, or code for requirements not in the spec
- One logical concern per commit

---

## §5 — Pre-Merge Checklist *(standard + full profiles only)*

Before merging any feature branch, all of the following must be true:

- [ ] All tests pass: `npm test`
- [ ] Zero TypeScript errors: `npm run typecheck`
- [ ] Zero lint errors: `npm run lint`
- [ ] Production build succeeds: `npm run build`
- [ ] Qualitative UX gate passed (if feature has UI surface)
- [ ] `/security-review` triggered and cleared
- [ ] No TODO comments in the diff

---

## §6 — Memory & Codebase Orientation *(full profile only)*

### Dynamic memory (claude-mem)
Query in layers to preserve tokens:
1. `search` → returns compact IDs only
2. `timeline` → returns chronological adjacency for found IDs
3. `get_observations` → returns full context for targeted IDs only

Never load full context on the first query.

### Static codebase memory (graphify)
Deploy exclusively on repos > 500 files.
Query via `query_graph`, `get_node`, `shortest_path`.
Load only the subgraph edges needed for the current task.
Do not load the full graph.

### Output compression (caveman)
Apply to internal notes, telemetry, and compressed summaries only.
Never apply caveman compression to:
- Executable code
- Terminal commands
- File paths
- User-facing output
