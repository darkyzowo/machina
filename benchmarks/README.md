# Machina v3 Benchmark Methodology

Compare **vanilla Claude Code** vs **Machina rigor** on the same canonical task.

## Fixture task

**Add pagination to a list API + UI** on a minimal Vite + Express (or similar) starter:

- Backend: cursor-based pagination, max page size 100
- Frontend: numbered pages, loading state, empty state
- Tests: API contract + component behavior

## Runs

| Run | Setup | Command |
|-----|-------|---------|
| A — Vanilla | No `.machina/`, no hooks | `claude` with plain task prompt |
| B — Machina | `make global-setup && make bootstrap && make profile-setup` | `/machina rigor` then same task prompt |

## Metrics (record in spreadsheet or `benchmarks/results.csv`)

| Metric | How to measure |
|--------|----------------|
| Time to first green test | Wall clock from prompt to first passing test |
| Time to mergeable | Wall clock to CI-equivalent green |
| Defects at review | Checklist: missing auth, console errors, invisible UI, missing tests |
| Pass-ceiling halts | Count from `.machina/telemetry.jsonl` |
| UX gate SKIPPED | Count + reason |
| Rework passes | Edits after first `green.txt` exit 0 |
| Security spec compliance | Abuse cases present before impl (rigor only) |

## Review checklist (human, blind to run label)

- [ ] Pagination respects max page size
- [ ] Empty state renders
- [ ] No console errors on primary flow
- [ ] Tests cover invalid page / edge cases
- [ ] Text readable at 375px width
- [ ] No secrets in diff

## Reporting

```bash
make report TARGET=./your-benchmark-project
```

Publish median deltas: `machina rigor` should show fewer review defects and more verifier artifacts, at the cost of higher time-to-first-commit on small tasks.

## Opt-in aggregate (future)

`machina telemetry upload` — not implemented in v3. Local `telemetry.jsonl` only.
