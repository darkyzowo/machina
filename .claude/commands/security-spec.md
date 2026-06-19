---
description: Create or update the feature security spec before implementation.
allowed-tools: Read, Grep, Glob, Write, Edit
---

# /security-spec

Create or update the security spec for the current task before implementation.

## Path

Use the first matching location:

1. If a spec-kit feature directory exists, write `specs/<feature>/security.md`.
2. Otherwise write or update `SECURITY_SPEC.md` at the project root.

Do not edit unrelated specs. Do not fix vulnerabilities in this pass unless the
user explicitly asked for security implementation work.

## Required Content

Write a concise Markdown spec with these sections:

- Scope: feature/task and files expected to change
- Assets: sensitive data, credentials, integrity-critical state, availability
- Trust boundaries: users, browser, server, third parties, filesystem, agent tools
- Authn/authz: session source, ownership checks, role/tenant assumptions
- Inputs and outputs: validation, encoding, path constraints, upload/download rules
- Secrets and config: required env vars, storage, logging exclusions
- Dependencies and supply chain: new packages, install scripts, pinned versions
- Abuse cases: 3-7 realistic misuse paths for this feature
- Required security tests/gates: unit/integration/e2e/audit checks to run
- Open questions: only blockers that change the secure design

## Halt Rule

HALT and ask the user when data sensitivity, ownership, auth context, or external
exposure is unclear and would produce incompatible secure designs.

## Completion

End with:

`Security spec ready: <path>`

In **rigor** mode, `phase-gate.js` blocks implementation writes until this file
exists with a `## Abuse cases` section.
