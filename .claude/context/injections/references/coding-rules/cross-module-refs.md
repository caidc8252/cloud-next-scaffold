# Cross-module references

Types and functions cross module boundaries **only** through the narrow public surfaces:

- server → server: `modules/<cat>/<mod>/server/<mod>.public.ts` (e.g. `roles.public.ts` re-exports `listAssignableRoles` + `type Role`, consumed by the users page `modules/system/users/ui/users-page.tsx`).
- client → client: `modules/<cat>/<mod>/client/<mod>.api.ts`.

MUST NOT deep-import another module's internals (`server/<mod>.service`, `*.repository`, `*.mapper`, `schema/*`, `ui/*`) — eslint `module-boundary/boundary` errors. If another module needs something, the owner exports it from its `.public` / `.api` file; consume that.

## Forward-declaration stubs (`*.stub.ts`)

A permission code the owning module has **not declared yet** is forward-declared with a colocated `modules/<cat>/<mod>.stub.ts` — a partial `defineModule` (from `@cloud/platform-config`) declaring **only** the referenced `permissions[].code`.

- `pnpm gen:coc` globs `apps/web/modules/**/*.stub.ts` and merges each `code` into the generated `PermissionCode` union, so the consumer type-checks before the owner ships.
- `defineModule` is shape-complete (zod-validated): `title` / `parentMenuCode` / `entry.url` and each permission's `label` / `desc` MUST all be present, but only `code` is load-bearing — the rest are throwaway placeholders; use the `stub.*` i18n namespace so they read as fake.
- coc guards: `menuCode` MUST equal `<cat>.<mod>`, and each permission's `belongToMenuCode` MUST equal `menuCode` (belongs-to-menu guard).
- Required header tags `@stub-owner` / `@stub-consumer` / `@stub-reason`, one value per line (optional `@stub-kind` / `@stub-declares` / `@stub-task` / `@stub-created`). The `next-kit/stub-notice` lint surfaces every stub and warns if the header is incomplete — a warning, not a build failure (a stub is legitimately present mid-development).
- Business code MUST NOT `import` a `*.stub` — the link is the generated union, never an import. The block is core `no-restricted-imports` (the `**/*.stub` pattern); `no-stub-import` is only the violation message label, not a rule name.
- When the owner declares the code for real the stub is redundant and MUST go — a leftover collides and fails the coc `duplicate-code` build gate. Because a stub lives beside the owner's module, surface a stale stub for a human rather than editing another module's files unilaterally.
