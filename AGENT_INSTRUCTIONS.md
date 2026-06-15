# AGENT_INSTRUCTIONS

You control only what is in your active context window.
You do not install packages, route models, manage databases, or schedule
background processes — the orchestrator owns those. These are the rules
an LLM can actually enforce.

---

## 0. Hard limits (non-negotiable at all profiles)

- **Done = verifiable.** A passing compiler, linter, or test — not your
  own judgement. Never self-grade output quality.
- **5-pass ceiling.** Stop after 5 recursive passes and hand off to human
  review. Do not extend your own autonomy or modify your own permissions.
- **No config mutation.** Never edit, delete, or rewrite `~/.claude`,
  `~/.codex`, `~/.cursor`, or any other user tool config. Audits are
  read-only and produce a report.

---

## 1. Before coding — Karpathy guidelines

**Think first.** State assumptions explicitly before writing a line.
On any ambiguity: HALT and ask. Do not guess at intent.

**Simplicity first.** Minimum line-count that satisfies the test.
No future-proofing. No single-use abstractions. No speculative generality.

**Surgical changes.** Edit only the targeted logic. Do not reformat
adjacent code, rename variables, or "clean up" anything you were not
explicitly asked to touch.

**Goal-driven.** Convert imperatives to verifiable constraints.
"Add validation" → "write tests for invalid inputs, then make them pass."

---

## 2. TDD — Red → Green → Refactor (mandatory)

1. **Red** — write a failing test first. Stop there.
2. Wait for the test runner to log the failure. You are **forbidden** from
   writing implementation logic before a real red signal exists.
3. **Green** — write the minimum code to pass. Nothing more.
4. **Refactor** — only once the bar is green.

Decompose work into ≈2–5 minute verifiable chunks.

---

## 3. On failure — systematic root-cause, not guessing

Form a hypothesis. Isolate the variable. Prove the hypothesis with a
targeted test. Fix. Re-run to confirm resolution. Only then advance.

---

## 4. Pre-merge checklist

Before merging any branch:
- Code review against the original spec (`/requesting-code-review`)
- All CI checks green: lint, typecheck, test, build
- Dependency audit clean: `npm audit` / `pip-audit`
- Secret scan clean: gitleaks
- Security review run (`/security-review` — read-only, no write tools)

---

## 5. Memory retrieval — query, do not administer (full profile only)

You query memory via MCP tools. You do not manage the stores.
Use the 3-layer progressive-disclosure pattern:

1. `search` → compact IDs only
2. `timeline` → chronological adjacency for those IDs
3. `get_observations` → full context for exactly the IDs you need

For repos > 500 files: query the code graph (`query_graph`, `get_node`,
`shortest_path`) instead of reading or grepping files. Load only the
subgraph the current task requires.

---

## 6. Output compression — Caveman, scoped not blanket

Compress conversational prose: drop filler, hedging, pleasantries,
tool announcements.

**Never compress:**
- Security warnings or irreversible-action confirmations
- Ordered multi-step sequences (fragment ambiguity causes misreads)
- All code, commit messages, and PR descriptions (byte-exact always)
- Active reasoning during a TDD cycle (degrades chain-of-thought quality)

Compression of stored memory files (`CLAUDE.md`, notes) is a separate
offline step run by the orchestrator via `caveman-compress`, which keeps
a `.original.md` backup.

---

## 7. Profile — read .agent-profile to know your tools

Read `.agent-profile` in the project root. If absent, assume `lean`.

| Profile    | What is installed and available                          |
|------------|----------------------------------------------------------|
| `lean`     | CI gates + superpowers (TDD, brainstorm, code review)    |
| `standard` | + spec-kit (`/speckit.*`) + caveman                      |
| `full`     | + claude-mem (memory MCP) + graphify (code graph MCP)    |

Do not call tools outside your active profile — they are not installed.

**spec-kit loop (standard+):**
`/speckit.constitution` → `/speckit.specify` → `/speckit.plan` →
`/brainstorm` (human gate) → `/speckit.tasks` → dispatch to worktrees

**Model routing (handled by orchestrator, not you):**
- Strategic / architecture / deep debug → Claude Opus 4.8
- Boilerplate / unit tests / localized logic → Claude Sonnet or Haiku
