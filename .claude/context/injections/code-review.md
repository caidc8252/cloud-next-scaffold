<!-- scaffold:injection:code-review -->
# Code Review Checklist (platform-module rules a CLAUDE.md-less reviewer misses)

> App is `apps/web`. These are THIS repo's traps a generic Next/TS reviewer overlooks. Depth → `.claude/docs/*`.

## Route / module layering (`server-layering.md`)

- **Route shell** — `app/api/**/route.ts` must be a thin re-export of the controller's named handlers (`export { GET, POST } from "@/modules/<cat>/<mod>/server/<mod>.controller"`). Any logic in `route.ts` → flag.
- **Controller order** — `assertPermissions → safeParse → service call → return envelope`, all inside `withApiHandler` (from `@/lib/api-handler`). `withApiHandler` here ONLY maps errors→envelope + sets request locale — it does **not** authenticate and does **not** bind any tenant context. So flag: a handler that adds a `try/catch` re-mapping errors (the only allowed `try/catch` is around `req.json()` → `BusinessError(ERR_INVALID_JSON)`); `.parse()` instead of `safeParse` + `throw new BusinessError("<ERR_*>")` (raw ZodError escapes). Missing `assertPermissions` → block-level.
- **Controller deps** — controller imports **only the service**; importing `@cloud/db`, `*.repository`, or `*.mapper` into the controller → flag.
- **Layer placement** — `service.ts`/`repository.ts`/`mapper.ts`/`policy.ts` under `modules/<cat>/<mod>/server/`; schemas under `modules/<cat>/<mod>/schema/`; zod parse at the controller, never in the service. Server logic inlined in the route or on the wrong layer → flag even if the route→service→data path is otherwise intact. Repository must be the only `@cloud/db` caller; mapper does Entity→VO only. Every `server/` file needs `import "server-only"`.
- **Service input shape** — service signature takes already-parsed typed input + the session, not `Request`/`NextRequest`/`URLSearchParams`. A service receiving HTTP primitives → flag.
- **No-service route** — controller doing DB access, mapping, or multi-step orchestration itself instead of delegating to the service → flag.
- **Two-layer authorization** — a route permission-code check is NOT a scope check. An operation touching a row by id must also enforce party/ownership scope (the repository `where: { partyId }` + a `policy.ts` check). A code-only check on an entity-scoped route → flag.

## Iron-law block-level findings

- **`'use server'`** (file- or function-level) anywhere → block. Write entry is `app/api/*` route handlers only; call via `@cloud/request/client`.
- **Bare permission strings** — `assertPermissions("...")` or a string array; must be the generated `PermissionCode` object form `{ all | any: [...] }` (from `@/manifest/_generated/registry-types.generated.ts`). `session.permissions.includes(...)` → use `assertPermissions` / server `hasPermissions`. `requirePermissions` wrapped in `try/catch` (it redirects; the catch never runs).
- **Hand-edited / committed `apps/web/manifest/_generated/*` or seed** — codegen output, gitignored, never committed, never hand-edited → block. A changed `manifest.ts` without a regenerated registry, a new module not added to `apps/web/manifest/collect.ts`'s import list (it stays invisible to `gen:coc`), or a deleted/renamed permission code not marked `@deprecated` → flag.
- **Tenancy (manual party scoping — there is NO RLS here)** — `@cloud/db` exposes `prisma` only; there is no `withTenantTx`/`tenantCtx`/GUC/`systemDb`. Flag: a business table without `party_id Int @map("party_id")` (it is `Int`, not uuid) + an index; a query NOT scoped by the session's `currentPartyId` in its `where`; an INSERT (parent or nested child) whose `partyId` isn't set from the session value; DB access outside `repository.ts`; an RSC/page calling `prisma` directly instead of going through a module service/`*.public.ts` with `currentPartyId` threaded in.
- **Cross-module deep import** — importing another module's internals (`server/service`, `repository`, `schema`, `ui`) instead of its `server/<mod>.public` (server) or `client/<mod>.api` (client) surface → block (the eslint `module-boundary` rule errors on it).
- **`*.stub` misuse** — a `*.stub.ts` imported by code → block (stubs are build inputs for `gen:coc`, never imported). A `*.stub.ts` still present after the owning module declares the code for real (stale — the coc `duplicate-code` build gate fires) → flag. A `*.stub.ts` missing its required `@stub-owner`/`@stub-consumer`/`@stub-reason` header (eslint `stub-notice` warns; template in `references/cross-module-stub.md`) → flag. `commons` with a non-null `menuCode`/`belongToMenuCode` or any call into a business module → flag.

## Envelope & errors (`@cloud/request`, `api-and-requests.md`)

- Raw `Response.json` in `app/api/**` instead of `successResponse`/`createdResponse`/`noContentResponse` (`@cloud/request/server`); a business error as bare `throw new Error` instead of `throw new BusinessError(code)` (infra → `throw new MiddlewareError(ERR_MW_*)`).
- `successResponse(item)` carrying a pager for a single resource (pager signals a list); a create returning `successResponse` instead of `createdResponse`; a no-body mutation returning `successResponse(null)` instead of `noContentResponse()`.
- Inlined error-code string literals — import the `ERR_*` constants from `@cloud/request/error-codes`.
- Client `catch` ignoring `err.body?.code` and substring-matching `err.message`; a hand-written 401→logout redirect (`window.location.*logout`) in a component (centralized via `setUnauthorizedHandler` + `apps/web/lib/session-expiry.ts`); a `catch` that swallows `RequestError` instead of letting it re-throw.
- Hand-rolled pagination (`take`/`slice` math, manual cursor encode) instead of `Pager` / `readCursorQuery` + `buildCursorPage()`; mixing `Pager` + `CursorPager` in one endpoint; client building a cursor from a row id or caching prior cursors (must echo the server's opaque cursor verbatim via `useCursorPagination()`).

## Client api layer (`api-and-requests.md`)

- A component calling `request.*` directly or inlining a `/api/...` path literal instead of going through `client/<mod>.api.ts` → flag.
- `client/<mod>.api.ts` exporting an object (`export const xxxApi = {...}`) or via a barrel `index.ts` instead of named functions (breaks tree-shaking); a `const BASE` instead of full per-function paths; names like `fetchUsers`/`getUserList` instead of `list<Entity>` (entity singular).
- An `api.ts` function `.then(r => r.data)` pre-unwrapping the envelope (lists lose sibling pager fields) instead of returning it as-is; a component inlining `type XxxResponse` instead of importing from the module `schema/`.

## Owner/party-scoped resource — authorization negatives

A route adding or changing party-keyed rows must carry the cross-owner negatives in its test: resource denial (A requests B's id → not found / zero rows), list scoping (assert contents, not just status), wrong-party mutation rejected, nested-write backstop (child can't be written with another party's id). A missing case → flag; diff-coverage won't surface a missing negative. Since isolation is the manual `where: { partyId }`, an entity-scoped route with no such test → flag.

## Shared packages — concrete triggers (`capability-ownership.md`)

- Re-implementing `packages/*`, or a new `packages/*` export with no rationale citing the closest existing alternative → flag. `packages/*` must never import `apps/*`.
- **`@cloud/permissions`** — `{ any: [...] }` is OR (satisfied by EITHER), `{ all: [...] }` is AND; a single `{ any: [a, b] }` does not require both. `import "server-only"` removed from a server file. Client gate (`<Can>`/`useCan` from `@cloud/permissions/client`) treated as a security boundary instead of UX-only.
- **`@cloud/db`** — `new PrismaClient()` or any `@prisma/client` import outside `packages/db` (client + model/enum types come from `@cloud/db`); a column renamed to snake_case instead of `@map`; a one-off script building its own client instead of importing `prisma` from `@cloud/db`.
- **`@cloud/i18n`** — hardcoded user-facing string in JSX (logs/IDs exempt); `locales` redefined locally (must be `["en","zh-CN","ja"]` from the package); cookie name hardcoded (use `LOCALE_COOKIE`/`TZ_COOKIE`); `as Locale` on user input (use `isLocale`); direct `next-intl` import (lint blocks it); a client provider given `messages` without `formats`; scattered `Intl.NumberFormat`/`Intl.DateTimeFormat` instead of the `formats` presets (`useFormatter`). Module menu/permission labels belong in `modules/<cat>/<mod>/i18n/{en,zh-CN,ja}.ts`.
- **`@cloud/security`** — `bcrypt`/`crypto.createHash`/raw `argon2` for passwords (must go through `@cloud/security/server`); RSA encrypt hand-written in the app instead of `@cloud/security/client` (paired with `/server` decrypt); `process.env.*` for secrets (use `@cloud/config` `getEnv()`).
- **`@cloud/log`** — bare `console.*` in server code → `createLogger("<scope>")`.
- **`@cloud/ui` (style boundary)** — external UI libs (`@radix-ui/*`, `@mui/*`, `react-aria`, `@headlessui/*`) imported in `apps/*` or `packages/ui` → block. Raw color/spacing/radius (`bg-[#...]`, `text-[14px]`, `p-[13px]`, inline `style={{ color }}`) where a token exists → flag.

## base-ui handler wiring

When the change wires handlers/props on `@cloud/ui` primitives, sanity-check against the primitive's `packages/ui/src/components/<name>.tsx` source. `@cloud/ui` re-skins **base-ui** (not Radix/shadcn), which spreads unknown props silently onto the DOM element — so shadcn/Radix-style names (`onSelect=`, `asChild=`) typecheck but never fire. Worth a comment.

## Images

Raw `<img>` flagged unless inside MDX. Use `next/image`.
