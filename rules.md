# Machina Agent Instructions
# Version: 2.5.0 — §1.4 security surface checkpoint, §4 HALT exceptions, §4.1 security exit gate
# Source: ~/.claude/machina/rules.md
# Do not edit directly — update rules.md in the repo and run: make update

---

## §0 — Read Your Profile

Read `.agent-profile` from the project root. Apply rules for your tier:

| Profile | Active sections |
|---------|----------------|
| lean    | §1 §2 §3 §4 §4.1 |
| standard | §1 §2 §3 §4 §4.1 §5 |
| full    | §1 §2 §3 §4 §4.1 §5 §6 |

**§4.1 is active on all profiles.** Security cannot be gated behind profile tier.

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

**Threshold:** Halt only when (a) the output type or deliverable format is unclear, (b) the target file or location is unspecified with multiple incompatible choices, or (c) missing spec would cause incompatible implementations. Do **not** halt when the deliverable type is clear and sensible defaults exist — state your assumptions and proceed.

When halting, name the **specific spec gaps** — at minimum, address what is missing from:
- Expected inputs and outputs or API contract
- Page size, endpoint format, or data shape (for data features)
- UI model: numbered pagination, infinite scroll, cursor-based, etc.
- Auth context: who owns this resource, how is the session available
- Edge cases the spec is silent on

Do not substitute environmental blockers (missing file paths, tooling not installed) for spec clarification. Fix blockers silently or ask separately — never let them stand in for spec questions.

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

### 1.4 Security Surface Checkpoint *(all profiles — any API endpoint, file upload, auth route, or LLM-backed feature)*

Before writing the first line of any handler, state answers to these six questions. Spec is silent → state the default and proceed. This takes two minutes and prevents the top vulnerability classes found in AI-assisted codebases.

Research basis: 65% of AI-built production apps contain at least one critical vulnerability; no LLM generates HTTP security headers, CORS policy, or rate limiting by default (OWASP LLM Top 10, CSA 2025).

1. **Auth** — Who can call this? Authenticated only / specific role / public? Any public write endpoint must be explicitly justified. Never rely on Next.js middleware as the sole auth enforcement point — middleware can be bypassed via header injection (CVE-2025-29927); auth must also be enforced at the route/handler layer.

2. **Rate limits** — State the limit: requests/minute per user AND per IP.
   - Default if spec is silent: 20 req/min per user, 60 req/min per IP.
   - LLM-backed endpoints additionally require: max calls per user per day.
   - Endpoints with financial cost surfaces (LLM, third-party APIs, file processing): if cost is unbounded, **HALT** and define a spend ceiling before proceeding. LLM APIs without rate limiting are vulnerable to Denial of Wallet (DoW) attacks — adversaries exploit per-token pricing to impose unbounded financial damage (OWASP LLM10:2025 Unbounded Consumption).

3. **Input constraints** — For file uploads: max size (default: 10 MB), explicit MIME type allowlist (not blocklist). For all payloads: max field lengths. No unbounded inputs. Serverless functions billed per invocation are especially vulnerable to variable-length input flooding — reading an unbounded file into memory before size-checking causes OOM crashes in serverless runtimes.

4. **Cost surface** — For any LLM call: `max_tokens` per call, max calls per user per day, hard spend ceiling in USD. State these before writing the handler. A fire-and-forget background job over N rows with no per-user cap is a DoW vulnerability regardless of intent.

5. **Trust boundary** — Does any output from this handler reach a browser, database, shell command, or downstream API? If yes: treat that output as untrusted. State the sanitization step. This applies to LLM output as much as user input — indirect prompt injection via uploaded files, retrieved URLs, or RAG content can weaponize model output even when the user prompt is clean (OWASP LLM01:2025 Prompt Injection).

6. **Ownership** — Any handler that reads or mutates data must scope the query to the session user. Correct pattern: `WHERE id = ? AND user_id = auth.uid()`. State this explicitly before writing the query. Return 404 (not 403) for unauthorised resource access — never reveal record existence to unauthorised callers.

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

**Step 0 — Verify agent-browser is installed:**
Run `agent-browser --version`. If the command fails:
- Log: `⚠ agent-browser not installed — UX gate SKIPPED. Run global-setup.sh to install.`
- Mark this feature as **SKIPPED** in handoff notes. SKIPPED ≠ PASSED.
- Do not mark the feature done until the gate is retested after installation.

**Step 0b — Verify dev server is responding:**
Run `curl -s http://localhost:5173 -o /dev/null -w '%{http_code}'`. If response is not `200`:
- Log: `⚠ Dev server not responding at localhost:5173 — UX gate SKIPPED.`
- Same SKIPPED status applies.

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
- Security improvements observed outside the task's explicit scope must be **noted** (comment or user message), not applied. Security fixes belong in a separate, explicitly scoped task. §4 takes precedence over passive security-pattern detection.

  **Exception — the following are HALT items, not notes.** Stop the current task, report the finding, and do not proceed until the human explicitly scopes a fix or approves an inline correction:
  - Missing auth check on any write, delete, or admin endpoint
  - Missing rate limit on any LLM-backed, file upload, or public write endpoint
  - Hardcoded secret, API key, credential, or connection string anywhere in source code
  - String concatenation used in any SQL query or shell command with user-supplied input
  - Missing file size or MIME type validation on any upload handler
  - LLM output rendered raw to a browser or passed unsanitized to a database or shell command
  - Next.js middleware used as the sole auth enforcement point with no route/handler-level check

---

## §4.1 — Security Exit Gate *(all profiles — before every commit)*

Before committing any diff that touches an API route, auth flow, file handler, LLM call, or data query, self-attest the following. Every item must be true or explicitly noted as out of scope with a reason.

**Auth & Access Control**
- [ ] Every new endpoint has an auth check at the route/handler layer — not middleware alone
- [ ] All data queries are scoped to the session user — no cross-user leakage possible
- [ ] Admin-only paths have a role check in addition to authentication

**Rate Limiting & Cost**
- [ ] Every new endpoint has rate limiting — per-user AND per-IP
- [ ] Every LLM call has a bounded `max_tokens` and a per-user call budget
- [ ] No financial cost surface is unbounded — spend ceiling defined or inherited from config

**Input Validation**
- [ ] All file uploads validate MIME type against an explicit allowlist before processing
- [ ] All file uploads enforce a size limit before reading file contents into memory
- [ ] No user-supplied input is interpolated into SQL queries or shell commands

**Output Safety**
- [ ] LLM output is not rendered raw to a browser (XSS / prompt injection pivot risk)
- [ ] LLM output passed to a database or downstream API is treated as untrusted and sanitized
- [ ] All new packages verified to exist on the package registry — hallucinated package names create slopsquatting supply chain attack vectors

**Secrets**
- [ ] No secrets, API keys, credentials, or connection strings appear anywhere in the diff

**Before first merge of any branch:** run `/security-review` and clear all CRITICAL and HIGH findings before merging, regardless of profile tier.

**On any unchecked item in Auth, Rate Limiting, or Secrets:** do not mark the task done. Halt and report.

---

## §5 — Pre-Merge Checklist *(standard + full profiles only)*

Before merging any feature branch, all of the following must be true:

- [ ] All tests pass: `npm test`
- [ ] Zero TypeScript errors: `npm run typecheck`
- [ ] Zero lint errors: `npm run lint`
- [ ] Production build succeeds: `npm run build`
- [ ] Qualitative UX gate passed (if feature has UI surface)
- [ ] §4.1 Security Exit Gate cleared for every commit in this branch
- [ ] `/security-review` triggered and cleared
- [ ] HTTP security headers configured: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`
- [ ] `npm audit` / `pip audit` run — no unaddressed CRITICAL or HIGH severity findings
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
