# Error handling

`withApiHandler` (`@/lib/api-handler`) auto-catches every throw and converts it to the error response via `handleApiError` — a composed mapper chain (order = priority): `AuthzError` (401/403) → `AppError` (BusinessError 40x / MiddlewareError 503) → caller `onError` (e.g. `s3ErrorResponse`) → Prisma → middleware duck-type → unknown → 500 `ERR_INTERNAL`. So:

- MUST NOT hand-write per-file `try { ... } catch (e) { return handleApiError(e) }`, and MUST NOT re-handle the `AuthzError` / Prisma branches yourself.
- MUST NOT `throw new Error("some text")` for a business failure — it has no stable `code`.
- Next control-flow throws (`redirect` / `notFound`) MUST be re-thrown, never swallowed by a local catch. RSC page-level expected errors use `notFound()` / `redirect("/403")`, not `BusinessError`.

**Throwing expected failures** — in controller/service/policy, `throw new BusinessError(code, status?, params?)` from `@cloud/request`. `status ∈ 400|401|403|404|409|422|423|429` (default 400); `params` is `{name}` interpolation rendered into the localized message, NOT put in the response body. Infrastructure faults (DB/Redis/mail) throw `new MiddlewareError(ERR_MW_*)` → masked to a generic 503. Log diagnostics with `console.error` yourself — `BusinessError` carries no devMessage.

**Error codes** are the protocol. Format: **5-hex-digit** `IISSS`: a 2-hex module id (`II`) + a 3-hex per-module ascending sequence (`SSS`), e.g. `10001`. Codes are add-only.

- Module ids partition the `II` space: `00–0F` = shared/common, `10–EF` = business modules, `F0–FF` = reserved for system/infra. Each `<cat>.<mod>` claims ONE unique 2-hex id in the single registry `apps/web/modules/module-error-id.ts`.
- Reuse `@cloud/request/error-codes` FIRST — module `00` = shared/common (`ERR_BAD_REQUEST`, `ERR_INVALID_JSON`, `ERR_INVALID_ID`, `ERR_UNAUTHORIZED`, `ERR_NOT_FOUND` …); middleware/infra lives in the `F0–FF` band (`ERR_MW_DB` / `ERR_MW_CACHE` / `ERR_MW_MAIL` / `ERR_MW_UNKNOWN`).
- A business module's codes colocate in its `error/` subdir: `apps/web/modules/<cat>/<mod>/error/<mod>.error-codes.ts`. Register their messages (`en` / `zh-CN` / `ja`) via `registerErrorMessages(...)` from `@cloud/request/server` in a sibling `apps/web/modules/<cat>/<mod>/error/<mod>.error-messages.ts`, and wire its side-effect import into the app's central error-message registration entry so pure page requests (which skip the route) can still localize. Registered `code` → localized by current locale; a missing language is a compile error.
- **Migration pending:** shipped codes use the 6-digit decimal `PMMNNN` scheme in `packages/request/src/error-codes.ts` + `apps/web/lib/<domain>-error-codes.ts` (and middleware at module `90`). New work follows the hex scheme above; the old codes convert with the error-code migration.
- Clients/tests/monitoring branch on the stable `code`, never on `message`.
