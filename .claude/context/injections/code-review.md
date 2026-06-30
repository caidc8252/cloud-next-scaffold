<!-- scaffold:injection:code-review -->
# Code Review — scaffold-specific gates

## MUST DO FIRST

Review the diff against `references/coding-rules.md` — this project's coding rules; they override generic Next/TS review habits. This file adds only the scaffold-specific gates a coding-rules pass won't catch.

## `*.stub` hygiene (cross-module forward declaration)

Review a `*.stub.ts` against its purpose — a throwaway forward-declaration carrying a two-way notice (*owner: declare this code for real*; *creator: delete it once they do*). Full convention → `references/cross-module-stub.md`.

- **Imported by code → block.** A stub is a placeholder that's deleted when the owner ships — importing it binds you to something that will vanish. The reference must be the string code resolved through the generated `PermissionCode` union, never an `import` (eslint `no-stub-import`).
- **Still present after the owner declared the real code → flag.** It's done its job; leaving it makes real + stub a duplicate (coc `duplicate-code` gate fires). Surface the stale stub for a human to delete rather than silently editing another module's file.
- **Missing its `@stub-owner`/`@stub-consumer`/`@stub-reason` header → flag.** That header *is* the two-way notice; without it the stub is an anonymous orphan no one is told to implement or remove (eslint `stub-notice`; legend + template → `references/cross-module-stub.md`).

## Owner/party-scoped resource — authorization negatives

A route that adds or changes party-keyed rows must carry the cross-owner negatives in its test: **resource denial** (A requests B's id → not found / zero rows), **list scoping** (assert contents, not just status), **wrong-party mutation rejected**, **nested-write backstop** (a child can't be written with another party's id). A missing case → flag; diff-coverage won't surface a missing negative.
