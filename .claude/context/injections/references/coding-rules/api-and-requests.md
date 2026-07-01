# API & requests

Route handlers under `app/api/*` are the ONLY write entry.

- Server actions (`'use server'`) are BANNED — every mutation and form submit goes through a route handler. Clients call via `@cloud/request/client`, then navigate themselves with `useRouter()`.
- Every handler is wrapped in `withApiHandler` (from `@/lib/api-handler`): `export const POST = withApiHandler(async (req) => { ... })`. Dynamic route params pass through the second arg: `withApiHandler(async (req, { params }) => { ... })`. S3/storage handlers add `{ onError: s3ErrorResponse }` as the second arg. MUST NOT hand-write `try/catch` + `handleApiError` per file (see [error-handling](error-handling.md)).
- Controller order in the handler: `assertPermissions` (see [auth-guards](auth-guards.md)) → parse `req.json()` then zod `safeParse` (throw `BusinessError(ERR_INVALID_JSON)` / `ERR_BAD_REQUEST` on failure) → call the module service → return an envelope.
- Success responses MUST go through `successResponse()` / `createdResponse()` from `@cloud/request/server`; body is `{ code:"OK", message, data, page?/limit?/total?/totalPages?/nextCursor?/prevCursor?/hasNextPage?/hasPrevPage?, traceId }` with pagination fields SIBLING to `data`. No-body responses use `noContentResponse()` (204, empty body, no `traceId`). Never build the JSON by hand.
- Pagination: offset via `Pager` (`page`/`limit`/`total`/`totalPages`); bidirectional cursor via `readCursorQuery(token, direction)` + `buildCursorPage()` + `CursorPager`. The cursor token is opaque (`encodeCursor`, anchor id only); `direction` is a separate client-supplied param, never encoded into the token. Don't reimplement the `take: limit + 1` slice in the handler.
- **Client calls** are collected into `client/<mod>.api.ts` (non-server-only) using `@cloud/request/client`. Components MUST NOT call `request.*` directly or inline `/api/...` path literals — only `client/` and `schema/` are client-importable; `server/` is server-only.
  - Export NAMED functions only (no `xxxApi` object, no barrels, no `import *`) so bundlers tree-shake. Write full URLs in each function (no `const BASE`).
  - Naming `<verb><Entity>`, entity singular: `getX(id)` / `listX(params?)` / `createX(input)` / `updateX(id, input)` / `deleteX(id)`; aggregate reads `get<Entity><name>`, domain actions `<action><Entity>`.
  - Request/response types come from the module's `schema/` (`z.infer` or `<mod>.types.ts` VO); never inline `type XxxResponse` in a component.
  - Return the `request.*` envelope RAW; read `.data` at the call site (don't `.then(r => r.data)` in `api.ts` or the list loses its pagination fields).
- Session-expiry 401 logout is handled by the package (`setUnauthorizedHandler`) + the `apps/web/lib/session-expiry.ts` whitelist. MUST NOT hand-write 401 redirects in business components.
- The error `code` is the protocol; branch on `err.body?.code` (`ERR_*` constants), NEVER on `message` (localized, changes with i18n). Don't treat "no visible entry point" as an access-control guarantee.

See also (deep spec): `.claude/docs/api-and-requests.md`.
