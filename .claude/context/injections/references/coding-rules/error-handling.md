# Error handling

`withApiHandler` (`@/lib/api-handler`) auto-catches every throw and converts it to the error response via `handleApiError` — a composed mapper chain (order = priority): `AuthzError` (401/403) → `AppError` (BusinessError 40x / MiddlewareError 503) → caller `onError` (e.g. `s3ErrorResponse`) → Prisma → middleware duck-type → unknown → 500 `ERR_INTERNAL`. So:

- MUST NOT hand-write per-file `try { ... } catch (e) { return handleApiError(e) }`, and MUST NOT re-handle the `AuthzError` / Prisma branches yourself.
- MUST NOT `throw new Error("some text")` for a business failure — it has no stable `code`.
- Next control-flow throws (`redirect` / `notFound`) MUST be re-thrown, never swallowed by a local catch. RSC page-level expected errors use `notFound()` / `redirect("/403")`, not `BusinessError`.

**Throwing expected failures** — in controller/service/policy, `throw new BusinessError(code, status?, params?)` from `@cloud/request`. `status ∈ 400|401|403|404|409|422|423|429` (default 400); `params` is `{name}` interpolation rendered into the localized message, NOT put in the response body. Infrastructure faults (DB/Redis/mail) throw `new MiddlewareError(ERR_MW_*)` → masked to a generic 503. Log diagnostics with `console.error` yourself — `BusinessError` carries no devMessage.

**Error codes** are the protocol (`message` is display-only). Format is a 6-digit `PMMNNN` string: Platform (1) + Module (2) + seq (3). Codes are add-only.

- Reuse `@cloud/request/error-codes` FIRST — Module `00` = shared/common (`ERR_BAD_REQUEST`, `ERR_INVALID_JSON`, `ERR_INVALID_ID`, `ERR_UNAUTHORIZED`, `ERR_NOT_FOUND` …), Module `90` = middleware/infra (`ERR_MW_DB` / `ERR_MW_CACHE` / `ERR_MW_MAIL` / `ERR_MW_UNKNOWN`), other `MM` = per business module (e.g. `01` users, `02` roles).
- App-domain codes not in the shared package live in `apps/web/lib/<domain>-error-codes.ts`, keeping the same `PMMNNN` numbering (e.g. Auth = Module `03`). Register their three-language messages (`en` / `zh-CN` / `ja`) via `registerErrorMessages(...)` from `@cloud/request/server` in a sibling `<domain>-error-messages.ts`, and add its side-effect import to `apps/web/lib/register-error-messages.ts` so pure page requests (which skip the route) can still localize. Registered `code` → localized by current locale; a missing language is a compile error.
- Clients/tests/monitoring branch on the stable `code`, never on `message`.
