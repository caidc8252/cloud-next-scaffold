# Server layering

Business logic lives in `apps/web/modules/<cat>/<mod>/`, split by layer. Never stack logic in a route handler.

- **route** (`app/api/**/route.ts`) — thin shell. ONLY re-export the module controller's named handlers: `export { GET, POST } from "@/modules/system/roles/server/roles.controller";`. No logic, no imports beyond the controller.
- **controller** (`server/<mod>.controller.ts`) — HTTP adapter, whole body wrapped in `withApiHandler`. Order: `assertPermissions` → parse (zod `safeParse`) → call service → return envelope (see [api-and-requests](api-and-requests.md)). MUST NOT import `@cloud/db`, `*.repository`, or `*.mapper` — depends only on service + schema.
- **schema** (`schema/<mod>.schema.ts` + `<mod>.types.ts`) — zod + VO types shared by client and server. Lives OUTSIDE `server/` so client forms can import it. Parse in the controller, never in the service.
- **service** (`server/<mod>.service.ts`) — business orchestration. Inputs are already-parsed typed data + the current session. MUST NOT receive `Request` / `NextRequest` / `URLSearchParams`. Expected failures throw `BusinessError` (see [error-handling](error-handling.md)).
- **policy** (`server/<mod>.policy.ts`) — scope / entity-level checks (does this record belong to the current party, can this user touch this target). Prefer pure functions for unit testing. Party scoping rules: [party-scoping](party-scoping.md).
- **repository + mapper** (`server/<mod>.repository.ts` + `*.mapper.ts`) — repository does prisma queries/mutations ONLY, with no session / permission / HTTP awareness; mapper does Entity → VO ONLY.
- **public** (`server/<mod>.public.ts`) — the narrow surface this module exposes to OTHER modules' server code. Cross-module imports MUST target `*.public` (or `client/<mod>.api` from clients); deep-importing another module's internals fails the eslint `module-boundary/boundary` rule.
- Every file under `server/` MUST start with `import "server-only"`.
- Cross-module pure helpers (e.g. `role-codes.ts`) go in `apps/web/lib/`, NOT inside a module's `server/`.
- Two-tier permissions: controller does the coarse 4-segment code check (`assertPermissions`, see [auth-guards](auth-guards.md)); service/policy do scope checks. Button show/hide is UX, not a security boundary.
- **Page fetch**: `page.tsx` (or `ui/<mod>-page.tsx`) stays thin — auth + top-level fetch + compose only. Fetch through the module's service or `*.public`, never raw prisma in a page.

See also (deep spec): `.claude/docs/server-layering.md`.
