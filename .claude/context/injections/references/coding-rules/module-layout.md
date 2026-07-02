# Module layout

A module is a self-contained business unit at `apps/web/modules/<cat>/<mod>/`. Its subdirs, canonical/maximal set (a given module MAY omit those it doesn't need):

- `manifest.ts` — permission-gated modules only: one `defineModule(...)` declaring `menuCode` + `parentMenuCode` (optional; defaults to `platform.main`) + the 4-segment `permissions[].code` set. Non-gated modules omit it (e.g. `identity/account`, `identity/auth`, `identity/forgot-password`, `identity/mfa`, `identity/onboarding`, `system/notification`). Editing it means re-running `pnpm gen:coc`; never hand-edit `manifest/_generated/*.generated.ts` or seed (iron law #3).
- `schema/<mod>.schema.ts` + `<mod>.types.ts` — zod + VO types shared by client and server; lives **outside** `server/` so client forms can import it.
- `server/` — layered backend, one file per layer:
  - `<mod>.controller.ts` — HTTP adapter (`assertPermissions` → parse → service → envelope).
  - `<mod>.service.ts` — business orchestration on parsed input + session.
  - `<mod>.policy.ts` (or `<mod>.scope.ts`) — scope / entity-level checks.
  - `<mod>.repository.ts` + `<mod>.mapper.ts` — prisma-only queries; Entity → VO only.
  - `<mod>.public.ts` — narrow cross-module server surface (other modules import only this).
  - Every `server/` file starts with `import "server-only"`.
- `client/<mod>.api.ts` — the module's client call surface (the cross-module client entry).
- `ui/` — `<mod>-page.tsx` + `components/`.
- `i18n/{en,ja,zh-CN}.ts` — module-scoped messages (real: `apps/web/modules/system/users/i18n/`).
- unit/component tests colocated beside source as `*.test.ts` (e.g. `manifest.test.ts`, `<mod>.service.test.ts`).
- `overview.md` — REQUIRED per module. The module's read-only "name card" for `/logic-analyze`; `/coding` creates and keeps it in sync as a planned deliverable. Thin/stable/outward — no internal implementation detail. Template below.

Where code goes:

- **`app/`** is a thin routing layer only. `app/api/**/route.ts` re-exports the module controller's intent-named handlers, aliased to HTTP verbs: `export { listUsers as GET, inviteUser as POST } from "@/modules/system/users/server/users.controller";`. A handler MAY instead be defined inline via `withApiHandler` (e.g. `apps/web/app/api/reset-password/route.ts`). `page.tsx`/`layout.tsx` do HTTP/render adaptation. MUST NOT hold thick business logic. Write entrypoints only in route handlers — no `'use server'` server actions (iron law #1).
- **`modules/<cat>/<mod>/`** — where business code lives (the AI generation landing spot).
- **`apps/web/commons/<mod>/`** — pure-tech units promoted up from `modules/`; sibling of `modules/`, a leaf layer.
- **`apps/web/lib/`** — cross-module pure helpers with no module home (e.g. `role-codes.ts` parsing role JSONB). Do NOT bury a cross-module helper inside one module's `server/`.
- **`packages/*`** — project-level shared infrastructure only.

## `overview.md` template (per module)

Thin, stable, outward — machine-readable lists preferred. Fields MUST derive from `manifest.ts` + `server/<mod>.public.ts` + `app/api/*` + `schema/`; do not fabricate.

Sections:
- **One-line responsibility** — what this business module does.
- **Data / entities** — each table, flag whether it carries `party_id`.
- **Outward public surface** — API routes (`<METHOD> /api/...`) + `server/<mod>.public.ts` exports.
- **Permission codes (4-seg)** — `<cat>.<mod>.<entity>.<action>` with meaning.
- **Dependencies** — which `modules/` and `commons/` it depends on, and why.
- **Invariants** — constraints code must obey that aren't in specs/prototype.
