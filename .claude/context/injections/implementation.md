<!-- scaffold:injection:implementation -->
# Implementation-time conventions (platform-module rules)

> App is `apps/web`. Business units live in `apps/web/modules/<cat>/<mod>/`. Each trap below is "when you do X, the trap is Y". Depth → `.claude/docs/*` (cited inline); don't restate the doc.

## When you lay out a module / pick a file

Layering is fixed (`server-layering.md`) — putting code on the wrong layer compiles but is wrong:
- `app/api/**/route.ts` is a **thin shell** that only re-exports the controller's named handlers — `export { GET, POST } from "@/modules/<cat>/<mod>/server/<mod>.controller";`. No logic here.
- `server/<mod>.controller.ts` — HTTP adapter, wrapped in `withApiHandler`. Imports **only the service**, never `@cloud/db`, `*.repository`, or `*.mapper`.
- `schema/<mod>.schema.ts` + `<mod>.types.ts` — zod + VO types, **outside `server/`** (client forms import them too). Parsing happens in the controller, never in the service.
- `server/<mod>.service.ts` — orchestration; input is **already-parsed typed data + the session**, never `Request`/`NextRequest`/`URLSearchParams`. Throws `BusinessError`.
- `server/<mod>.policy.ts` — scope/entity-level checks as pure functions (single-testable).
- `server/<mod>.repository.ts` + `<mod>.mapper.ts` — repository is the **only** `@cloud/db` caller (no session/permission/HTTP awareness); mapper does Entity→VO only.
- `server/<mod>.public.ts` — the narrow surface other modules' **server** code may call.
- `client/<mod>.api.ts` — the client call surface (see below).
- Every file under `server/` starts with `import "server-only";`. Cross-module-reusable pure helpers go in `apps/web/lib/`, not inside one module's `server/`.

## When you reference another module (cross-module = surface model)

The eslint `module-boundary` rule **errors** on any deep import into another module. Reach another module ONLY through its surface:
- Server→server: import `@/modules/<cat>/<mod>/server/<mod>.public`.
- Client: import `@/modules/<cat>/<mod>/client/<mod>.api`.
- Never import another module's `server/<mod>.service`, `repository`, internal `schema`, `ui`, etc. — only `*.public` / `*.api` are allowed targets.

## When you reference a permission CODE another module will own but hasn't declared yet

This is for forward-declaring a **permission code** (so `assertPermissions(["other.mod.x.read"])` typechecks against `PermissionCode`) — NOT for types/functions (those go through the `*.public`/`*.api` surface above).
- Write a colocated `apps/web/modules/<cat>/<mod>.stub.ts` (sibling of the target module) — a **partial `defineModule`** declaring ONLY the referenced code(s).
- `gen:coc` aggregates `*.stub.ts`, so the code enters the `PermissionCode` union and your reference compiles.
- **Never `import` a `*.stub`** — stubs are build inputs; code never imports them.
- Delete the stub once the owning module declares the code for real — the coc `duplicate-code` build gate flags a stale one (real + stub = duplicate), and typechecking catches a code you guessed wrong (it's not in the union).

## When you edit a manifest or a permission code (`coc-declaration.md`)

`manifest.ts` (`defineModule` from `@cloud/platform-config`) is the single source of truth; `apps/web/manifest/_generated/*.generated.ts` and seed are codegen output — **never hand-edit them, never commit them** (gitignored; CI red on drift). Edited a `manifest.ts`? run `pnpm gen:coc`. A **new** module must also be added to `apps/web/manifest/collect.ts`'s import list — `gen:coc` reads only what `collect.ts` exports, so an un-collected module is invisible.
- Permission code is 4-segment `<cat>.<mod>.<fn>.<action>` (fixed length); `menuCode = <cat>.<mod>`; `belongToMenuCode` must equal the module's `menuCode` and the code's first two segments. Codes are append-only — to drop/rename, mark `@deprecated`, don't delete.
- Reuse an existing `<action>` verb (`view create update delete invite lock …`) for consistency. Need several codes at one route? compose with `assertPermissions({ all | any: [...] })` — never mint a composite code.
- Who may hold a code (role↔permission, contract gate) is human-owned `apps/web/manifest/catalog/{roles,contract-types}.ts` — don't decide it. `commons` is a leaf layer: `menuCode=null`, never gated, never calls a business module.

## When writing a mutation (`api-and-requests.md`)

Route handlers only — `'use server'` is banned (file- and function-level); clients call routes via `@cloud/request/client`. Keep the controller a thin adapter wrapped in `withApiHandler` (from `@/lib/api-handler`): `assertPermissions → safeParse → service → return envelope`.
- `withApiHandler` does error→envelope mapping + request-locale ONLY. It does **not** authenticate, does **not** bind any tenant context. So: do the auth yourself with `assertPermissions(...)` (it returns the session; throws 401/403). Do **not** add a handler `try/catch` to re-map errors (withApiHandler already does) — the one allowed `try/catch` is around `await req.json()`, throwing `new BusinessError(ERR_INVALID_JSON)` on failure.
- Parse with `schema.safeParse(...)` and `throw new BusinessError("<ERR_*>")` on `!success` — never `.parse()` (its raw ZodError escapes the envelope).
- Errors: `throw new BusinessError(code, status?, params?)` for business (codes are `ERR_*` from `@cloud/request/error-codes`), `throw new MiddlewareError(ERR_MW_*)` for infra — never a bare `throw new Error`, never raw `Response.json`.
- Responses (`@cloud/request/server`): `createdResponse(x)` for a create, `successResponse(x)` for a read, `noContentResponse()` for a no-body mutation. `successResponse(item)` for a single resource carries NO pager (a pager signals a list).

## When asserting permissions (`auth-permissions.md`)

`assertPermissions({ all | any: [...] })` — object form, codes typed by the generated `PermissionCode` (from `@/manifest/_generated/registry-types.generated.ts`), never a bare string/array (a typo'd/stale code must fail typechecking). `any` = OR, `all` = AND.
- A permission-code check is **not** a scope check: holding the code doesn't mean the row is yours. Two-layer authz — coarse code at the controller (`assertPermissions`), entity/ownership scope in service/policy (`policy.ts` pure functions, `hasPermissions` for finer code checks).
- Pages/layouts use `requirePermissions()` (it **redirects** on failure — never wrap it in `try/catch`, the catch never runs). In-component gate: `<Can check={{...}}>` / `useCan(...)` from `@cloud/permissions/client` — UX mirror, not a security boundary.

## When accessing data — tenancy is MANUAL party scoping (no RLS here)

There is **no RLS, no `withTenantTx`, no `tenantCtx`, no GUC, no `systemDb`** in this repo. `@cloud/db` exports `prisma` only. Tenant isolation = every query and mutation is scoped by the **current party id**, an `Int` taken from the session (`session.currentPartyId`) and threaded down into the repository as a `where`/data field:
- All DB access lives in `repository.ts`; pass `partyId` in and scope on it (`where: { partyId, ... }`). On INSERT, set the row's `partyId` from that same session value — including nested child rows, so a nested write can't land another party's id.
- Business tables carry `party_id Int @map("party_id")` (NOT uuid) + an index; the composite unique is `@@unique([partyId, <businessKey>])`.
- From an RSC/page: resolve the session and pass `currentPartyId` into the module's service / `*.public.ts`; never call `prisma` directly in a page.
- Use `prisma` from `@cloud/db` only — no `new PrismaClient()`, no `@prisma/client` import outside `packages/db`; snake_case columns via `@map`, not renamed fields.

## When writing a list endpoint (`api-and-requests.md`)

Two pagination modes — never mix them in one endpoint. Offset (`Pager`: `page`/`limit`/`total`/`totalPages`) when the UI needs page numbers; bidirectional cursor (`CursorPager`) otherwise. For cursor: read with `readCursorQuery(token, direction)`, `take: limit + 1` to probe, hand the rows to `buildCursorPage()` to slice + sign — never hand-roll the slice math. The `encodeCursor()` token is opaque and encodes only the anchor; `direction` is a separate request param, not baked into the token. Client-side use `apps/web/lib/use-cursor-pagination.ts`'s `useCursorPagination()` — echo the server's cursor back verbatim, never build one from a row id, never cache prior pages' cursors.

## When writing the client call layer (`api-and-requests.md`)

Funnel every client HTTP call into `client/<mod>.api.ts` (NOT server-only) — components never call `request.*` directly and never inline `/api/...` literals.
- Export **named functions only** (no `export const xxxApi = {...}` object — kills tree-shaking; no `index.ts` barrel; callers don't `import *`). Write the **full path** in each function (no `const BASE`).
- Naming `<verb><Entity>`, entity **singular**: `getX(id)` / `listX(params?)` / `createX(input)` / `updateX(id, input)` / `deleteX(id)`; aggregate read `get<Entity><Name>`, domain action `<action><Entity>`. Not `fetchUsers`/`getUserList`.
- Request/response types come from the module's `schema/` (the same zod the controller parses); never inline `type XxxResponse` in a component.
- Return the `request.*` envelope **as-is** — read `.data` at the call site; don't `.then(r => r.data)` (lists lose their sibling pager fields).
- 401 session-expiry → logout is centralized: `@cloud/request/client`'s `setUnauthorizedHandler` + `apps/web/lib/session-expiry.ts`. Never hand-write a `window.location.*logout` redirect in a component. `RequestError` is re-thrown after the handler, so existing `catch`/`toastError` still fire — don't swallow it; branch on `err.body?.code` (an `ERR_*` constant), never a `message` substring.

## When wiring `@cloud/ui` primitive handlers

`@cloud/ui` re-skins **base-ui**, not Radix/shadcn. Before assuming a prop name, read the primitive's source (`packages/ui/src/components/<name>.tsx`). Base-ui spreads unknown props silently onto the DOM element, so the compiler accepts a wrong name (`onSelect`, `asChild`, …) with no error and a handler that never fires — source-read is the only verification. Use `next/image`, not raw `<img>`.

## When rendering user-facing text (`i18n.md`)

No hardcoded visible strings — every label/button/toast/empty/error state goes through `@cloud/i18n` (`useTranslations` in Client Components, `getTranslations` in RSC); add the `en` key first, other locales carry diffs. Module menu/permission labels live in `modules/<cat>/<mod>/i18n/{en,zh-CN,ja}.ts` (coc namespace); global app messages in `apps/web/i18n/messages/`. `locales` is fixed `["en","zh-CN","ja"]` from the package — don't redefine it; narrow user input with `isLocale`, never `as Locale`; use `LOCALE_COOKIE`/`TZ_COOKIE`, not literal cookie names; go through `@cloud/i18n/server` or `/client`, never `next-intl` directly (lint blocks it). Number/date formatting via the `formats` presets (`useFormatter`), not scattered `Intl.*`. A client `NextIntlClientProvider` needs both `messages` and `formats`.

## When using shared packages (`capability-ownership.md`)

Check `packages/*` before re-implementing infra; `apps/*` must never be imported by `packages/*`. Passwords go through `@cloud/security/server` (its RSA pair: `@cloud/security/client` encrypt + `/server` decrypt); secrets via `@cloud/config` `getEnv()`, not `process.env`. Server logs via `createLogger("<scope>")`, not `console.*`. Don't import external UI libs (`@radix-ui/*`, `@mui/*`, `react-aria`, `@headlessui/*`) into `apps/*` or `packages/ui`; use team tokens, not raw `bg-[#...]`/`text-[14px]`/inline color.

## When editing an error boundary

Reuse the existing boundary files (`app/(dashboard)/error.tsx`, `app/(portal)/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`); this Next's error/retry API is version-specific — read `node_modules/next/dist/docs/` (current retry entry is `unstable_retry()`), don't assume a stock `reset()`.

## When writing tests

Pick the level: **unit** by default (pure service orchestration over an injected fake repo, no DB); **integration** when a real collaborator/backing service is the point; **e2e** for party-scoping/cross-page/auth/middleware. Colocate unit/component tests next to the code; e2e under `e2e/`.

## When the code is party/owner-scoped (authorization negatives — mandatory)

A row keyed to one party: party B must not see or mutate party A's row. Since enforcement is the manual `where: { partyId }`, the test must prove it holds — **resource denial** (A requests B's id → not found / zero rows), **list scoping** (A's list returns only A's rows — assert contents, not just status), **wrong-party mutation rejected**, **nested-write backstop** (a nested child can't be written with another party's id). Diff-coverage won't surface a missing negative — write all of them.
