<!-- Scaffold-owned reference: the generic cross-module stub convention.
     planning.md / implementation.md / code-review.md / coding-rules/* defer here;
     the eslint `stub-notice` rule flags the header, and `/submit-work` gates it.
     This is scaffold machinery (the /coding Step-3 logic), distinct from team-owned
     coding-rules. -->

# Cross-module stub (`*.stub.ts`)

## What it is

A `*.stub.ts` is a **temporary, importable forward-declaration of an unbuilt cross-module dependency** — the consumer authors it in its own module so it isn't blocked waiting on another.

- **You import it.** That is the mechanism (there is no import ban).
- **`@stub-*` header** — `owner`, `consumer`, `reason` are **required**; `kind`, `declares`, `task`, `created` are recommended. Keep each value on one line (the lint parser reads to end-of-line).
- **`stub-notice` lint (warn)** surfaces it on every `pnpm lint`, naming owner + consumer, and nags if the header is incomplete.
- **Soft deletion.** Once the real thing exists, swap the import to the owner's real surface (`server/<mod>.public` / `client/<mod>.api`, or the real code) and delete the stub. Nothing hard-fails mid-development.
- **One hard gate:** `/submit-work` runs `scripts/check-stubs.mjs` and blocks the PR to `develop` if any `*.stub.*` survives. Local dev is unblocked; a stub can never ship.
- `gen:coc` and `build-registry` know nothing about stubs.

A stub may sit in another team's module tree; **surface a stale or inbound stub for a human** rather than editing it unilaterally.

## The `@stub-*` header

| tag | value |
|-----|-------|
| `@stub-kind` | `public-api` (function/service), `type` (type/schema), or `permission-code` |
| `@stub-owner` | `<cat>/<mod>` that must build the real thing |
| `@stub-consumer` | `<cat>/<mod>` depending on it now |
| `@stub-reason` | one line: what forces the reference before the owner ships |
| `@stub-declares` | the forward-declared symbol(s)/code(s), comma-separated |
| `@stub-task` | originating task id (e.g. `task-1234`) |
| `@stub-created` | date added (`YYYY-MM-DD`) |

## Kinds

### `public-api` / `type` — no extra rules

The generic mechanism is the whole story: a fake importable file, swapped to the owner's real surface when it lands. A wrong fake fails **loudly at the call site**.

```ts
// modules/system/users/roles-dep.stub.ts
/**
 * @stub-kind     public-api
 * @stub-owner    system/roles
 * @stub-consumer system/users
 * @stub-reason   users page calls roles.assignReviewer before roles ships
 */
export function assignReviewer(): Promise<void> {
  throw new Error("stub: system/roles not implemented");
}
```
Consumer imports `assignReviewer`; swaps to `system/roles/server/roles.public` when real, then deletes the stub.

### `permission-code` — a localized cast

A permission code has no runtime symbol to fake. Instead of a `throw`ing function, the stub exports the **code string cast to `PermissionCode`**, confined to the stub file:

```ts
// modules/system/users/roles-dep.stub.ts
import type { PermissionCode } from "@/manifest/_generated/registry-types.generated";
/** @stub-kind permission-code  @stub-owner system/roles  @stub-consumer system/users  @stub-reason users list guards on roles.assign before roles ships */
export const rolesAssignRead = "system.roles.assign.read" as PermissionCode;
```
Consumer imports it and passes it to `assertPermissions({ all: [rolesAssignRead] })`; swaps the import to `system/roles`'s real code and deletes the stub once roles ships.

**Rationale:** a bare code string already compiles (`assertPermissions` args are `string[]`; 铁律 #2 not yet enforced), so the stub isn't a compile-unblock — write it for the `@stub-owner` notice + `/submit-work` gate. The cast is the forward-looking convention; the code **fails closed at runtime** until the owner ships and seeds it.

## Lifecycle (who acts)

- **Create** — consumer: write the stub + full `@stub-*` header, import it.
- **Implement** — owner: `stub-notice` lists every stub you own; build the real thing.
- **Delete** — consumer: swap the import to the real surface, delete the stub.
