# Generic cross-module stub — design

**Date:** 2026-07-01
**Status:** approved design, pre-plan
**Scope:** scaffold machinery (`gen:coc`, eslint, docs, `/submit-work`) — no `apps/web` business modules, and no change to `permissionSchema` / `build-registry`.

## Problem

Today "stub" means exactly one thing: a **permission-code forward-declaration**. A consumer that references a permission code the owning module hasn't declared yet drops a `modules/<cat>/<mod>.stub.ts` — a fake owner `defineModule` — which `gen:coc` discovers via a dedicated glob and merges into the `PermissionCode` union. Enforcement: business code may not `import` it (eslint `no-restricted-imports`), and a `duplicate-code` build gate forces removal once the owner declares the code for real.

Two problems:

1. **It only covers permission codes.** The thing that actually blocks development is often an unbuilt *function / service / type* in another module. The scaffold has **no story** for that — you either block on the owner, or fake it ad-hoc with no owner-notification and no guarantee it doesn't ship.
2. **`gen:coc` is coupled to the stub concept.** ~11 lines (a `*.stub.ts` glob + concat into `modules`) exist for nothing but stubs. `gen:coc` should be a pure manifest aggregator that has never heard the word "stub."
3. **The `duplicate-code` hard gate re-blocks the consumer.** Today, once the owner declares the real code, the residual stub collides (`duplicate-code`) and the build hard-fails — including on the consumer mid-task, through no fault of their own. Cleanup is forced by breakage, not guidance — the exact blocking the mechanism exists to prevent.

## Goals

- A **generic** stub concept: an importable forward-declaration of *any* unbuilt cross-module dependency (function, type, permission code, future kinds).
- `gen:coc` has **zero** stub awareness.
- **Unblock, don't block**: no consumer build ever breaks because of someone else's merge timing.
- Enforcement is **guidance (lint + team rule) across create / implement / delete**, with a **single hard gate** at the PR-to-`develop` boundary.
- **Permission-code is one kind, not the definition** — it folds into the generic mechanism with a single-sentence rule, not a registry sub-mechanism. Stubbing is not inherently about permissions.

## Non-goals

- No change to how permission codes are *referenced* at call sites (`assertPermissions([...])` stays a string checked against the generated `PermissionCode` union).
- No re-architecture of the CoC registry, menu projection, or seeding.
- No new stub *kinds* built speculatively — the generic frame supports them, but only `permission-code`, `public-api`, and `type` are documented, and only `permission-code` carries bespoke machinery.

---

## Design

Two layers. The generic layer is **carried by machinery, not prose** (约定大于配置, 代码大于文档). The one prose rule is scoped to `permission-code`, because that is the only kind whose failure is invisible to the author.

### Layer 1 — the generic stub mechanism (kind-agnostic)

A `*.stub.ts` is **an importable forward-declaration of an unbuilt cross-module dependency**, so a consumer isn't blocked.

- **You import it.** That is the mechanism. (The old `no-stub-import` ban is removed.)
- **`@stub-*` header** — `kind`, `owner`, `consumer`, `reason` (required); `declares`, `task`, `created` (recommended). This is the two-way notice: it tells the **owner** "someone depends on you, build this" and the **consumer** "swap me when the real thing lands."
- **`stub-notice` lint (warn)** guides all three lifecycle phases (see table below).
- **Soft deletion.** Once the real thing exists, the consumer swaps the import to the owner's real surface (`*.public` / `*.api` / the real code) and deletes the stub. Nothing in the registry or build hard-fails mid-development.
- **One hard gate** at `/submit-work` (the PR-to-`develop` boundary): block if any `*.stub.ts` survives. This is where "unblock locally" meets "never ships."
- **`gen:coc` knows nothing about stubs.**

Nothing in Layer 1 is permission-specific. The conventions Claude can't infer (the filename, the header, the gate, the swap target) are enforced by the template + lint + gate + existing module-layout rule — **not** by a prose tutorial on how to fake a function, which Claude already knows.

### Layer 2 — per-kind rules

**`kind: public-api` / `kind: type`** (functions, services, types, schemas):
No extra machinery. The generic frame *is* the whole mechanism — a fake importable file (a `throw`ing function, a placeholder type), swapped to the owner's `*.public.ts` / `*.api.ts` when it lands. This is the capability the scaffold **lacks today**; Layer 1 alone delivers it. A wrong fake fails **loudly at the call site**, so no prose rule is needed.

```ts
// modules/finance/invoices/roles-dep.stub.ts
/**
 * @stub-kind     public-api
 * @stub-owner    system/roles
 * @stub-consumer finance/invoices
 * @stub-reason   invoice approval calls roles.assignReviewer before roles ships
 */
export function assignReviewer(): Promise<void> {
  throw new Error("stub: system/roles not implemented");
}
```
Consumer imports `assignReviewer` from the stub; swaps to `system/roles/server/roles.public` when real.

**`kind: permission-code`** (a registry token — *not* a runtime symbol you can fake):
Still **no bespoke machinery** — it folds into the generic mechanism. A permission code has no runtime symbol to fake, so instead of a `throw`ing function the stub exports the **code string cast to `PermissionCode`**, confined to the gated-out stub file:

```ts
// modules/finance/invoices/roles-dep.stub.ts
import type { PermissionCode } from "@/manifest/_generated/registry-types.generated"; // exact path per plan
/** @stub-kind permission-code  @stub-owner system/roles  @stub-consumer finance/invoices  @stub-reason ... */
export const rolesAssignRead = "system.roles.assign.read" as PermissionCode;
```
Consumer imports it and passes it to `assertPermissions({ all: [rolesAssignRead] })` — type-checks via the cast. `gen:coc` and `build-registry` are **never involved**; the code is not aggregated, seeded, or menu-projected during the stub phase. Swap the import to `system/roles`'s real surface (its `manifest`-backed code / `*.public`) and delete the stub once roles ships.

The *entire* permission-code rule is one sentence: **a permission code has no runtime symbol to fake, so its stub exports the code cast to `PermissionCode`; it fails closed at runtime until the owner ships and seeds it.** Why the cast rather than a `provisional` schema flag: the rest of the stubbed dependency (roles' functions) already `throw`s at runtime, so making *just the permission* runtime-real buys nothing — and a transient forward-declaration state does not belong in the permanent `permissionSchema`.

### Lifecycle guidance surface

| Phase | Who acts | `stub-notice` lint (mechanical, warn) | Team rule (prose) |
|---|---|---|---|
| **Creation** | consumer | validate `@stub-*` header is complete; warn if `owner`/`consumer`/`reason` missing | generic: template only. permission-code: the one-sentence rule (export the code cast to `PermissionCode`) |
| **Implementation** | owner | surface every stub whose `@stub-owner` is this module (planning inbound-sweep) | "declare it for real here" |
| **Deletion** | consumer | warn: the real thing exists → the stub is redundant, remove it | who removes it + surface-to-human caveat when it's another team's tree |
| **Gate** | — | — | `/submit-work` blocks the PR to `develop` if any `*.stub.ts` survives |

---

## Concrete changes

> **Untouched by design:** `packages/platform-config/src/coc/define-module.ts` (no `provisional` field — `permissionSchema` stays 4 fields) and `build-registry.ts` (no guard skip, no supersede). The permission-code stub never enters a manifest or the registry, so neither file changes.

1. **`scripts/generate-coc-registry.mjs`** — delete the stub glob block (lines ~24–36) and the `...stubModules` spread (line ~36). `gen:coc` now reads only `collect.ts` modules.
2. **`eslint.nextkit.mjs`**
   - remove `STUB_PATTERN` from `no-restricted-imports` (importing a stub becomes legal).
   - generalize `stub-notice`: keep the `@stub-*` header validation (kind-agnostic), and add the deletion-phase warning surface (a stub whose declared codes/surface now exist for real). Stays `warn`.
   - **the message carries the parsed `@stub-owner` / `@stub-consumer`** (the rule already parses them for completeness) via `context.report({ data })`, so the notice is actionable without opening the file:
     - `present`: `stub [{{kind}}] — owner {{owner}}, consumer {{consumer}}: import it now; swap to {{owner}}'s real surface and delete once it ships.`
     - `incomplete`: owner/consumer may be the missing values, so name the missing tags instead — `stub header incomplete — missing @stub-{{missing}} (required: owner, consumer, reason).`
3. **New hard gate** — mirror the existing groom-residue gate in **`/submit-work`**: before opening a PR to `develop`, block if any `*.stub.ts` remains. Optionally back it with a reusable `scripts/check-stubs.mjs` (mirroring `check-e2e-orphans.mjs`) so a future committed CI workflow can call `pnpm check:stubs` too.
4. **Docs**
   - `references/cross-module-stub.md` — restructure to **generic mechanism (Layer 1)** + a **`permission-code` section (Layer 2)**. The generic part is mostly the header template + a pointer to lint/gate; the permission-code part carries the registry prose.
   - `references/coding-rules/cross-module-refs.md`, `references/coding-rules/permission-codes.md`, `references/code-review.md` — repoint from "never import / duplicate-code gate" to "import it / soft-delete / submit-work gate."
   - `AGENTS.md` 铁律 #8 — rewrite for the generic model.
   - `injections/implementation.md:18`, `injections/planning.md:9,31` — update the create/implement/delete guidance and the inbound-sweep.

## Migration

No `*.stub.ts` files exist in the repo today (verified: the glob returns nothing). The mechanism is entirely latent, so there is **no data migration** — only the machinery and docs change. First real stub is authored under the new model.

## Risks & mitigations

- **A stub whose owner never ships** — lingers as an importable fake. Caught by the `/submit-work` gate (no `*.stub.ts` reaches `develop`) and the standing `stub-notice` warning.
- **Permission-code stub fails closed at runtime during the stub phase** — accepted and consistent: the rest of the stubbed dependency already `throw`s, and fail-closed is the safe default. Tests that must exercise the guarded path mock the session/permission.
- **Soft deletion lets a redundant stub sit locally after the owner ships** — intentional (the anti-blocking property). The gate is the backstop; `stub-notice` keeps nudging.
- **A stub (function / type / cast) diverges from the eventual real signature/type** — surfaces as a normal type error at swap time (loud, local); acceptable.

## Open questions

- Exact `@stub-kind` value naming (`public-api` vs `module-surface`; `type` vs `schema`) — cosmetic, settle in the plan.
- Whether `check-stubs.mjs` ships now or waits for a committed CI workflow — the `/submit-work` gate is the primary enforcement either way.
