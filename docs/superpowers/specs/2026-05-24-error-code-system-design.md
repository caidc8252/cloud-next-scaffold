# Error Code System — Design Spec

> Scope: Framework-level error code and trace ID system across server responses, logging, and frontend toast display.

## Overview

Every failed API response carries three pieces of information:

1. **message** — human-readable error description
2. **code** — 6-digit hex error code, static per error type, business-categorized
3. **traceId** — per-request unique trace ID for log correlation

## Error Code Format

6-digit hexadecimal: `P MM FFF`

| Position | Meaning | Range | Example |
|---|---|---|---|
| 1st digit | Platform | `0-A` | `1` = current platform |
| 2nd-3rd digits | Module | `00-FF` | `00` = common, `01` = users, `02` = roles |
| 4th-6th digits | Specific error | `000-FFF` | `001` = invalid email |

Example: `101001` = Platform 1 → User module → Invalid email format.

Similar errors may share a code. Codes are centrally managed in `packages/request/src/error-codes.ts`.

## Trace ID Format

`{PREFIX}-{6-char-hex}`

- `BIZ-a3f7c8` — business errors (HTTP 4xx)
- `SYS-b2d9e1` — system errors (HTTP 5xx)

Generated server-side per error response. Unique per request.

## 1. Response Envelope

`ErrorBody` in `packages/request/src/index.ts`:

```typescript
export type ErrorBody = {
  message: string;
  code: string;      // "101001"
  traceId: string;   // "BIZ-a3f7c8"
};
```

## 2. Server-side Error Responses

`packages/request/src/server.ts`:

- All error functions take `code` as first parameter
- Auto-generate `traceId` based on HTTP status (4xx → `BIZ-`, 5xx → `SYS-`)
- Auto-log: `console.error(`[${traceId}] [${code}] ${message}`)`

```typescript
errorResponse(code: string, message: string, status?: number): Response
badRequestResponse(code: string, message?: string): Response
unauthorizedResponse(code?: string, message?: string): Response
forbiddenResponse(code?: string, message?: string): Response
notFoundResponse(code?: string, message?: string): Response
```

Convenience functions have default codes from the common module (`100001`-`100005`).

## 3. Error Code Constants

New file `packages/request/src/error-codes.ts`:

```typescript
// Platform 1, Module 00 = Common
export const ERR_BAD_REQUEST     = "100001";
export const ERR_UNAUTHORIZED    = "100002";
export const ERR_FORBIDDEN       = "100003";
export const ERR_NOT_FOUND       = "100004";
export const ERR_INTERNAL        = "100005";
export const ERR_INVALID_JSON    = "100006";

// Platform 1, Module 01 = Users
export const ERR_USER_EMAIL_INVALID       = "101001";
export const ERR_USER_EMAIL_TAKEN         = "101002";
export const ERR_USER_NOT_FOUND           = "101003";
export const ERR_USER_INVALID_ID          = "101004";
export const ERR_USER_NO_PENDING_INVITE   = "101005";

// Platform 1, Module 02 = Roles
export const ERR_ROLE_DELETE_BUILTIN      = "102001";
export const ERR_ROLE_DELETE_ASSIGNED     = "102002";
export const ERR_ROLE_NOT_FOUND           = "102003";
```

## 4. Client-side Error Toast

New file `packages/request/src/error-toast.ts` (client-only):

```typescript
export function toastError(err: unknown, fallbackMessage?: string): void
```

- If `err` is `RequestError` with `body.code`: show structured toast (10s duration)
- Otherwise: show fallback message (5s duration)

Toast layout:
```
┌─────────────────────────────────────────────┐
│ ✕  A valid email is required.          Copy │
│    [101001] BIZ-a3f7c8                      │
└─────────────────────────────────────────────┘
```

- Line 1: `message` (sonner main message)
- Line 2: `[code] traceId` (sonner description)
- Copy button: copies JSON to clipboard:

```json
{
  "message": "A valid email is required.",
  "code": "101001",
  "traceId": "BIZ-a3f7c8"
}
```

## 5. Uncaught Exception Handling

Every API route handler wraps logic in `try/catch`. Uncaught exceptions produce:
- Code: `100005` (ERR_INTERNAL)
- TraceId: `SYS-xxxxxx`
- Log: full stack trace with traceId
- Response: `{ message: "Internal server error.", code: "100005", traceId: "SYS-..." }` with status 500

## 6. Caller Migration

All `catch` blocks in frontend components change from:

```typescript
catch { toast.error("Failed to save user"); }
```

to:

```typescript
catch (err) { toastError(err); }
```

## Files Affected

| File | Change |
|---|---|
| `packages/request/src/index.ts` | Expand `ErrorBody` type |
| `packages/request/src/server.ts` | All error functions: add code param, generate traceId, log |
| `packages/request/src/error-codes.ts` | New — centralized error code constants |
| `packages/request/src/error-toast.ts` | New — unified error toast function |
| `packages/system/src/roles/roles-panel.tsx` | Replace `toast.error()` with `toastError()` |
| `packages/system/src/users/users-page.tsx` | Replace `toast.error()` with `toastError()` |
| `packages/system/src/users/pending-invite-detail.tsx` | Replace `toast.error()` with `toastError()` |
| `apps/web/app/api/system/roles/route.ts` | Add error codes |
| `apps/web/app/api/system/roles/[roleId]/route.ts` | Add error codes + try/catch |
| `apps/web/app/api/system/users/route.ts` | Add error codes + try/catch |
| `apps/web/app/api/system/users/[userId]/route.ts` | Add error codes + try/catch |
| `apps/web/app/api/system/users/[userId]/lock/route.ts` | Add error codes + try/catch |
| `apps/web/app/api/system/users/[userId]/reset-password/route.ts` | Add error codes + try/catch |
| `apps/web/app/api/system/users/[userId]/resend-invite/route.ts` | Add error codes + try/catch |
| `apps/web/app/api/system/users/[userId]/cancel-invite/route.ts` | Add error codes + try/catch |
