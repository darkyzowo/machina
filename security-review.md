---
description: Read-only security audit of the current worktree. No write access.
allowed-tools: Read, Grep, Glob
---

# /security-review

You are running a **read-only** security audit. Your tools are Read, Grep,
and Glob only. You have no Write, Edit, Bash, or file-mutation access.
If a fix is required, report the finding — a human or a separate write-enabled
pass applies it. Do not attempt workarounds.

Audit the current worktree for the following, in order:

1. **Hardcoded secrets** — tokens, private keys, passwords, connection strings,
   API keys embedded in source files or config.

2. **Injection surfaces** — unsanitized input flowing into shell commands, SQL
   queries, `eval`, template engines, or filesystem path operations (path
   traversal). Check for missing input validation and output encoding.

3. **SSRF / unvalidated outbound requests** — HTTP clients calling
   user-controlled URLs without an allowlist or scheme/host validation.

4. **Unsafe deserialization or dynamic evaluation** — `pickle`, `eval`,
   `exec`, dynamic `import`, or `__import__` with user-controlled values.

5. **Dependency risk** — unpinned or known-vulnerable packages. Cross-check
   against the CI dep-audit job results if available.

6. **Auth and permission gaps** — missing authentication checks, bypassable
   authorization, over-broad roles, or unenforced access controls.

7. **Supply-chain surface** — any `curl | bash`, unpinned `latest` tags, or
   install scripts that execute remote code without verification.

**Output format:** Group findings by severity (critical / high / medium / low).
Each finding: severity, file:line, description, concrete remediation.
End with a one-line summary count per severity level.
