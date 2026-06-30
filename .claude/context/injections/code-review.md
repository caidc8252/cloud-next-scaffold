<!-- scaffold:injection:code-review -->
# Code Review — scaffold-specific gates

## MUST DO FIRST

Review the diff against `references/coding-rules.md` — this project's coding rules; they override generic Next/TS review habits. This file adds only the scaffold-specific gates a coding-rules pass won't catch.

## `*.stub` hygiene (cross-module forward declaration)

- A `*.stub.ts` imported by code → block — stubs are build inputs for `gen:coc`, never imported (eslint `no-stub-import`).
- A `*.stub.ts` still present after the owning module declares the code for real → flag — stale; the coc `duplicate-code` gate fires (real + stub = duplicate).
- A `*.stub.ts` missing its required `@stub-owner`/`@stub-consumer`/`@stub-reason` header → flag (eslint `stub-notice` warns; legend + template → `references/cross-module-stub.md`).

## Owner/party-scoped resource — authorization negatives

A route that adds or changes party-keyed rows must carry the cross-owner negatives in its test: **resource denial** (A requests B's id → not found / zero rows), **list scoping** (assert contents, not just status), **wrong-party mutation rejected**, **nested-write backstop** (a child can't be written with another party's id). A missing case → flag; diff-coverage won't surface a missing negative.
