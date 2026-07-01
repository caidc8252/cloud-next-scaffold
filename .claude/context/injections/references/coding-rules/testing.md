# Testing

**Pick the lowest level that exercises the real behavior:**

| Behavior | Level |
|---|---|
| Pure function, Zod schema, service orchestration over an injected fake repo (no DB) | Unit — Vitest, `pnpm test` |
| Service + real schema/policy, or repository against a real test DB / backing service | Integration — Vitest, `pnpm test` |
| Auth / login / logout / role-gated redirect / party-scoping / cross-page full-stack flow | e2e — Playwright spec under `e2e/`, `pnpm test:e2e` |

- **Colocate unit and component tests next to the code they exercise; e2e specs live under `e2e/`** as `e2e/<feature>.spec.ts`.
- **Party-scoping authorization-negatives are REQUIRED for every owner-scoped table** (rule → [party-scoping](party-scoping.md)). Diff-coverage won't flag a missing negative, so write all four as Vitest service/repository tests:
  - **list scoping** — a query as party A returns only A's rows (assert contents, not status).
  - **resource denial** — looking up party B's id while scoped to A returns not-found / zero rows.
  - **wrong-party mutation rejected** — an update/delete of B's row scoped to A affects nothing.
  - **nested-write backstop / fail-closed** — a nested child can't be written with another party's id; a query with no `currentPartyId` must not leak across parties.
- **Every `route.ts`, boundary `page.tsx`, `middleware.ts`, and session/permission gate carries a JSDoc `@e2e-cell` marker** (`/** @e2e-cell feature=<name> kind=<route|middleware|auth-boundary> */`). The `require-e2e-cell` eslint rule forces one on every `route.ts` / `middleware.ts` — ship it or opt out with `/** @e2e-cell-skip reason=… */`; `kind=auth-boundary` is not lint-forced, add it by hand.
- **`pnpm check:e2e-orphans` (run inside `pnpm test:e2e`) requires a matching `e2e/<feature>.spec.ts`** for each marker — join is by feature+kind presence: `kind=route` covered by any `test(` in the spec, `kind=middleware` by a `@middleware:` tag, `kind=auth-boundary` by an `@authBoundary:` tag.
- **When acceptance test cases are supplied, treat them as exhaustive** — transcribe every case at the level the picker gives; never summarize, sample, or drop one.
