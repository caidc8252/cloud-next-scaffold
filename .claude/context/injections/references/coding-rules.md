# Coding rules — index

Before writing or editing code, read only the rule(s) whose **Applies when** matches your work — they override generic Next/TS habits.

Rule filenames are stable anchors; if you rename one, update every link to it.

## Where code lives
- [module-layout](coding-rules/module-layout.md) — scaffolding a *new* module (required subdirs, `manifest.ts`, `overview.md`).
- [commons](coding-rules/commons.md) — writing under `apps/web/commons/`, or promoting a reusable unit out of `modules/` (into a `@cloud/*` package → package-boundaries).
- [package-boundaries](coding-rules/package-boundaries.md) — working *inside* `packages/*`, or deciding whether a capability belongs in a shared `@cloud/*` package. (Using a package is routed by its concern — auth, api, etc.)

## Server
- [server-layering](coding-rules/server-layering.md) — writing a module's `server/` layers: controller / service / schema / policy / repository / mapper / public.
- [api-and-requests](coding-rules/api-and-requests.md) — adding a `route.ts` / route handler (the sole write entry), or a client→server call.
- [error-handling](coding-rules/error-handling.md) — throwing or catching an error, or defining an error code.

## Data & tenancy
- [party-scoping](coding-rules/party-scoping.md) — reading or writing a business table: scoping every query/mutation by `currentPartyId`.
- [database](coding-rules/database.md) — designing or changing a table / prisma schema (incl. the required `party_id` column + index and per-party unique).

## Permission model (CoC)
- [coc-declaration](coding-rules/coc-declaration.md) — editing `manifest.ts`, a generated CoC file (`*.generated.ts` — never hand-edit), or the `catalog/` role/contract files.
- [permission-codes](coding-rules/permission-codes.md) — minting, renaming, or deprecating a permission code (format / granularity / registry).
- [cross-module-refs](coding-rules/cross-module-refs.md) — needing a type, function, or permission code another module owns.

## Auth
- [auth-guards](coding-rules/auth-guards.md) — adding or changing auth on a page, layout, or route handler, incl. guarding with a permission code.

## Client & UI
- [ui-and-pages](coding-rules/ui-and-pages.md) — adding or editing a page or a UI component.

## Cross-cutting
- [i18n](coding-rules/i18n.md) — adding user-facing copy, or menu / permission / error labels.
- [logging](coding-rules/logging.md) — adding or changing log output.
- [env-config](coding-rules/env-config.md) — reading or adding an environment variable / config value.
- [testing](coding-rules/testing.md) — writing or changing a test (level, colocation, what to assert).
- [naming-and-style](coding-rules/naming-and-style.md) — baseline; applies to all TypeScript in the repo (incl. constant / enum conventions).

## Capabilities
- [storage](coding-rules/storage.md) — uploading, storing, or serving a file.
- [caching](coding-rules/caching.md) — using the cache layer (`@cloud/cache`): cache-key naming, TTL, invalidation.
- [notice](coding-rules/notice.md) — sending or rendering an in-app notice.
- [email](coding-rules/email.md) — sending email.
