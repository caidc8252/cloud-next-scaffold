# Module layout

A module is a self-contained business unit at `apps/web/modules/<cat>/<mod>/`. Its subdirs are fixed:

- `manifest.ts` — the module's single source of truth: one `defineModule(...)` declaring `menuCode` + `parentMenuCode` + the 4-segment `permissions[].code` set. Editing it means re-running `pnpm gen:coc`; never hand-edit `manifest/_generated/*.generated.ts` or seed (iron law #3).
- `schema/<mod>.schema.ts` + `<mod>.types.ts` — zod + VO types shared by client and server; lives **outside** `server/` so client forms can import it.
- `server/` — layered backend, one file per layer (`<mod>.controller` → `.service` → `.policy` → `.repository` + `.mapper` → `.public`); per-layer responsibilities, `server-only`, and the cross-module `.public` boundary → [server-layering](server-layering.md).
- `client/<mod>.api.ts` — the module's client call surface (the cross-module client entry); rules → [api-and-requests](api-and-requests.md).
- `ui/` — `<mod>-page.tsx` + `components/`; page rules → [ui-and-pages](ui-and-pages.md).
- `overview.md` — REQUIRED per module (`.claude/docs/module-overview.md` template). The module's read-only "name card" for `/logic-analyze`; `/coding` creates and keeps it in sync as a planned deliverable. Thin/stable/outward — no internal implementation detail.

Where code goes:

- **`app/`** is a thin routing layer only. `app/api/**/route.ts` re-exports the module controller's named handlers (`export { GET, POST } from "@/modules/<cat>/<mod>/server/<mod>.controller";`); `page.tsx`/`layout.tsx` do HTTP/render adaptation. MUST NOT hold thick business logic. Write entrypoints only in route handlers — no `'use server'` server actions (iron law #1).
- **`modules/<cat>/<mod>/`** — where business code lives (the AI generation landing spot).
- **`apps/web/commons/<mod>/`** — pure-tech units promoted up from `modules/`; sibling of `modules/`, a leaf layer. See [commons](commons.md).
- **`apps/web/lib/`** — cross-module pure helpers with no module home (e.g. `role-codes.ts` parsing role JSONB). Do NOT bury a cross-module helper inside one module's `server/`.
- **`packages/*`** — project-level shared infrastructure only. See [package boundaries](package-boundaries.md).

See also (deep spec): `.claude/docs/module-overview.md`.
