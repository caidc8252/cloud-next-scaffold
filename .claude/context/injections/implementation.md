<!-- scaffold:injection:implementation -->
# Implementation-time conventions

## MUST DO FIRST

Before writing or editing any code, read `.claude/context/injections/references/coding-rules.md` — it overrides generic Next/TS habits.

## When writing tests

Pick the level: **unit** by default (pure service orchestration over an injected fake repo, no DB); **integration** when a real collaborator/backing service is the point; **e2e** for party-scoping/cross-page/auth/middleware. Colocate unit/component tests next to the code; e2e under `e2e/`.

## When the code is party-scoped (authorization negatives)

A row belongs to one party (party-scoping rule → `coding-rules.md`): prove the guard holds with negative tests — **resource denial** (A requests B's id → not found / zero rows), **list scoping** (A's list returns only A's rows — assert contents, not status), **wrong-party mutation rejected**, **nested-write backstop** (a nested child can't be written with another party's id). Diff-coverage won't surface a missing negative — write all four.

## When you depend on something another module hasn't built yet

Forward-declare it with a colocated **importable** `modules/<cat>/<mod>/<name>.stub.ts` (a `throw`ing fake for a function, a placeholder type, or `export const c = "…" as PermissionCode` for a permission code) with a complete `@stub-owner`/`@stub-consumer`/`@stub-reason` header, and **import it** to keep building. Once the owner ships, swap the import to the owner's real `*.public` / `*.api` (or real code) and delete the stub (surface it for a human when it sits in another team's module). Header legend + kinds + template → `references/cross-module-stub.md`. The one hard gate is `/submit-work` — no `*.stub` reaches `develop`.

## When writing routes, middleware, or auth boundaries

Carry a JSDoc `@e2e-cell` marker (`/** @e2e-cell feature=<name> kind=<kind> */`):
- `kind=route` — `route.ts`, boundary `page.tsx`
- `kind=middleware` — `middleware.ts`
- `kind=auth-boundary` — a route/wrapper gating on session/permission (`requireSession()` / `requirePermissions()`)

`require-e2e-cell` (eslint) forces a marker on every `route.ts` / `middleware.ts` — ship one or opt out with `/** @e2e-cell-skip reason=… */`. `kind=auth-boundary` isn't lint-forced — add it by hand. `pnpm check:e2e-orphans` (in `pnpm test:e2e`) requires a matching `e2e/<feature>.spec.ts`.

Coverage join is by feature+kind presence, not name: `kind=route` covered by any `test(` in `e2e/<feature>.spec.ts`; `kind=middleware` by a `@middleware:` tag; `kind=auth-boundary` by an `@authBoundary:` tag. Feature = spec filename.
