# Auth guards

Import guards from `@cloud/permissions/server`, never via deep relative paths.

## Three tiers

Every entry point (route handler, page, layout) picks exactly one:

- **Public** — no session. Read with `getSession()`; it returns `null` when unauthenticated (and when a user is signed in but has no current party). Branch on `null`; never assume a session.
- **Authenticated** — login required, no specific code. Call `requireSession()`; it redirects (logout, or `/select-partner` when signed in without a party) instead of returning `null`.
- **Authorized** — a specific `PermissionCode` is required:
  - Route handlers (`app/api/*`) MUST use `assertPermissions(check)` — throws `AuthzError(401)` unauthenticated, `AuthzError(403)` when the session lacks the code.
  - Pages / layouts MUST use `requirePermissions(check)` — same check, but it `redirect()`s: `/api/auth/logout` on 401, `/403` on 403.

Both return the `ActiveSession` (the source of `currentPartyId`). `check` is `{ all?, any? }`; codes MUST be typed `PermissionCode`, not raw strings.

## Server guards are the only boundary

- The `useCan` / `<Can>` client helpers (`@cloud/permissions/client`, alongside `usePermissions`) are for DISPLAY ONLY — hiding buttons, menus. They are NOT a security boundary and MUST NOT gate a read/write.
- MUST NOT `getSession()`-then-execute a sensitive op. Any op with a permission requirement goes through `assertPermissions` / `requirePermissions`.
- Put the guard close to the data / page entry. A `layout` guard or a client `useCan` check MUST NOT be the sole protection for a child page or its data access.

## Effective-permission model

Guards only read `session.permissions`, computed at company-switch into the snapshot (`apps/web/lib/session-snapshot.ts`): party scope (`resolvePartyScope(contractTypes)` — codes the party's contracts unlock) is the outer gate for everyone; `authorizingType === "ADMIN"` gets the whole scope (bypasses assigned roles, still inside the contract gate), `NORMAL` gets role codes ∩ scope.

Two role classes feed that computation:

- **GLOBAL** hardwired roles — `roleId ≤ 1000` (`PRESET_ROLE_ID_MAX`), defined in `apps/web/manifest/catalog/roles.ts`, read-only, not stored in the DB.
- **PRIVATE** DB roles — `roleId ≥ 1001` (`DB_ROLE_ID_MIN`), rows in the `sys_role` table (`prisma.sysRole`).

A new fine-grained code MUST be declared via CoC before a guard can require it.

## Page error boundaries

Reuse the existing files — `apps/web/app/(dashboard)/error.tsx`, `apps/web/app/(portal)/error.tsx`, `apps/web/app/global-error.tsx`, `apps/web/app/not-found.tsx`. Before touching them, read the current Next.js error-handling docs under `node_modules/next/dist/docs/`; the retry entry is `unstable_retry()`.
