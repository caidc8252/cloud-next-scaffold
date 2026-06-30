<!-- Scaffold-owned reference: the cross-module permission-code stub convention.
     planning.md / implementation.md / code-review.md defer here; the eslint
     `stub-notice` rule enforces the header. Distinct from coding-rules.md, which
     is team-owned — this is scaffold machinery (the /coding Step-3 logic). -->

# Cross-module forward-declaration stub (`*.stub.ts`)

## What it is

A `*.stub.ts` is a **temporary forward-declaration of a codegen-aggregated, string-referenced cross-module token**. The mechanism is *not* permission-specific — it's defined by **how the token is referenced**: a stub is **never imported**, so it can only stand in for something a generated artifact resolves by string. **Permission codes are the only such token in the system today** (the flagship `@stub-kind`).

Worked example (kind = `permission-code`): module A references a code that module B will own but hasn't declared yet, so A can't compile — the code isn't in the generated `PermissionCode` union. The stub injects it:

- `pnpm gen:coc` globs `apps/web/modules/**/*.stub.ts`, reads `permissions[].code`, and merges each into the `PermissionCode` union.
- A's `assertPermissions({ all: ["b.mod.x.read"] })` is checked against that union — so it now type-checks.

You therefore **never `import` a stub** (eslint `no-stub-import`): the link is the generated union, not a module import. The build fails when the code is *missing from the union*, not when the stub is un-imported — the stub is what puts it there.

**The boundary is physical, not a policy choice.** A stub can stand in only for a token referenced *by string and resolved through codegen* — because a never-imported file cannot supply anything that must be `import`ed. So import-referenced **types/functions** are out: they cross modules via `server/<mod>.public` / `client/<mod>.api` (see `coding-rules.md`), which must be real files.

## Two-way notice

The file's existence is a standing TODO with two readers:

- **Owner** (`@stub-owner`) — the target module that must declare the code for real in its `manifest.ts`, then **delete the stub**.
- **Dependant** (`@stub-consumer`) — the module relying on it now; safe to build against, but it vanishes when the owner ships.

`pnpm lint`'s `stub-notice` rule surfaces both from the header on every run — a `warn`, not a build failure (a stub is legitimately present mid-development). Removal is independently forced: once the owner declares the code, real + stub = duplicate → the coc `duplicate-code` gate fails the build.

## The `@stub-*` header

`@stub-owner`, `@stub-consumer`, `@stub-reason` are **required** — `stub-notice` warns "header incomplete" without them. The rest are recommended for traceability. Keep each value on one line (the lint parser reads to end-of-line), and don't restate the tag names in prose above the block.

| tag | value |
|-----|-------|
| `@stub-kind` | the token kind — `permission-code` today (the only codegen string-token the system aggregates from stubs) |
| `@stub-owner` | `<cat>/<mod>` that must implement the code(s) and delete this stub |
| `@stub-consumer` | `<cat>/<mod>` referencing the code(s) now (why the stub exists) |
| `@stub-reason` | one line: what forces the reference before the owner ships |
| `@stub-declares` | the forward-declared code(s), comma-separated |
| `@stub-task` | originating task id (e.g. `task-1234`) |
| `@stub-created` | date the stub was added (`YYYY-MM-DD`) |

## Template (kind = `permission-code`)

The `@stub-*` header is identical for every kind; the body below is the **permission-code** form — a `defineModule` that `gen:coc` reads. A different kind keeps the header and swaps the body for whatever its generator consumes. Copy verbatim and fill in the values:

```ts
/**
 * STUB — temporary cross-module forward-declaration. NOT a real module; delete when real.
 *
 * Two-way notice (full legend: context/injections/references/cross-module-stub.md):
 *   ▸ OWNER     — must declare the real code in its manifest.ts, then delete this file.
 *   ▸ DEPENDANT — safe to build against now; this vanishes once the owner ships the real one.
 *
 * @stub-kind        permission-code
 * @stub-owner       system/roles
 * @stub-consumer    system/users
 * @stub-reason      users list page guards on system.roles.assign before the roles module ships
 * @stub-declares    system.roles.assign.read
 * @stub-task        task-1234
 * @stub-created     2026-06-30
 *
 * No import needed (and none allowed — eslint no-stub-import): the reference is a string
 * literal checked against the generated `PermissionCode` union (gen:coc globs this file and
 * injects the code). The build fails when the code is MISSING from the union, not when it's
 * un-imported — this stub is what puts it there.
 */
import { defineModule } from "@cloud/platform-config";

export default defineModule({
  moduleCategory: "system",
  moduleName: "roles",
  menuCode: "system.roles",                       // MUST equal the code prefix (belongs-to-menu guard)
  title: "stub.system.roles.title",               // placeholder i18n key (stub.* = throwaway)
  parentMenuCode: "system",
  entry: { url: "/system/roles" },                // placeholder
  permissions: [
    {
      code: "system.roles.assign.read",           // ← the only load-bearing token
      belongToMenuCode: "system.roles",           // MUST equal menuCode (guard)
      label: "stub.system.roles.assign.read.label", // placeholder; the owner supersedes
      desc: "stub.system.roles.assign.read.desc",
    },
  ],
});
```

## Rules (permission-code kind)

- Declare **only** the referenced code(s), not the owner's full permission set.
- `defineModule` is shape-complete (zod-validated): `title` / `parentMenuCode` / `entry.url` / `label` / `desc` must all be present, but only `permissions[].code` is load-bearing — the rest are throwaway placeholders the owner's real `manifest.ts` supersedes. Use the `stub.*` i18n namespace so they're obviously fake.
- `menuCode` MUST equal the code prefix (`<cat>.<mod>`), and each permission's `belongToMenuCode` MUST equal `menuCode` — the coc belongs-to-menu guard errors otherwise.
- Never `import` a `*.stub` (eslint `no-stub-import`).
- Delete the stub the moment the owner declares the code for real — a stale one fails the coc `duplicate-code` build gate, and `stub-notice` keeps warning until it's gone.
