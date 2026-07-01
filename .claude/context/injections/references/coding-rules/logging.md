# Logging

- **Server logs go through `createLogger("<scope>")` from `@cloud/log` — never bare `console.*`.** `scope` names the source module (`mail` / `auth` / `http`), so lines are filterable by origin.
- **Levels** are `debug` / `info` / `warn` / `error`; the threshold is `LOG_LEVEL` (default `info`; set `debug` when debugging). Under vitest logging is silenced to `error` only unless an explicit `LOG_LEVEL` is set. `debug`/`info` write to stdout, `warn`/`error` to stderr.
- **One format: JSON lines** (identical dev and prod, so platforms scrape stdout/stderr and index by field/level). Pipe through `| jq` for local readability — do not add a pretty printer. Each line carries `time` / `level` / `traceId` / `seq` / `scope` / `msg` / `method` / `path` plus the `context` you pass.
- **Pass errors and structured data via the `context` argument, not string-concatenated into `msg`.** An `Error` in `context` is serialized to `{ name, message, stack }` for you.
- **Never log secrets or raw PII.** Connection strings, keys, tokens, and full emails/phones stay out of log lines; use `maskEmail` for email. `getConfig()` secrets are server-only — do not echo them.
- **traceId is automatic — do not hand-thread it.** `withApiHandler` opens an `AsyncLocalStorage` context at the `/api/*` entry; every `@cloud/log` call and every error/success response body in that request shares one `traceId` (the front-end id equals the log id, end-to-end traceable). An inbound `x-request-id` header is reused for cross-service correlation.
- **Enrich once after the session resolves:** `enrichTrace({ userId, partyId })` — subsequent lines carry it automatically. Read the current id with `getTraceId()`.
- **Limits:** trace context covers only `/api/*` (`withApiHandler`); RSC page data-fetch has no traceId yet. `@cloud/log` is server-only and a leaf package — never make it depend on a business package.

See also (deep spec): `.claude/docs/logging.md`.
