<!-- scaffold:injection:code-review -->
# Code Review — scaffold-specific gates

## MUST DO FIRST

Review the diff against `references/coding-rules.md` — this project's coding rules; they override generic Next/TS review habits. This file adds only the scaffold-specific gates a coding-rules pass won't catch.

## `*.stub` hygiene (cross-module forward declaration)

Review a `*.stub.ts` against its purpose — a throwaway, importable forward-declaration carrying a two-way notice (*owner: build this*; *consumer: swap + delete once they do*). Full convention → `references/cross-module-stub.md`.

- **Still present after the owner shipped the real thing → flag.** It's done its job; the consumer should have swapped the import to the owner's `*.public`/`*.api` (or real code) and deleted it. `/submit-work` blocks it from reaching `develop`. Surface a stale stub for a human rather than editing another module's file.
- **Missing its `@stub-owner`/`@stub-consumer`/`@stub-reason` header → flag.** That header *is* the two-way notice; without it the stub is an anonymous orphan no one is told to build or remove (eslint `stub-notice`).
- **A permission-code stub that declares a manifest entry or touches `gen:coc` → flag.** It should be a localized `export const … = "…" as PermissionCode`, nothing more.

## Owner/party-scoped resource — authorization negatives

A route that adds or changes party-keyed rows must carry the cross-owner negatives in its test: **resource denial** (A requests B's id → not found / zero rows), **list scoping** (assert contents, not just status), **wrong-party mutation rejected**, **nested-write backstop** (a child can't be written with another party's id). A missing case → flag; diff-coverage won't surface a missing negative.
