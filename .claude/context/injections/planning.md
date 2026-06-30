<!-- scaffold:injection:planning -->
# Planning a module — what to nail down

> Code conventions live in `references/coding-rules.md`; plan within them. This file covers only the planning decisions a coding-rules pass doesn't make.

## Module unit
- One module at `apps/web/modules/<cat>/<mod>/` with `manifest.ts` + `server/{controller,service,repository,mapper,policy,public}.ts` + `client/<mod>.api.ts` + `schema/` + `i18n/` + `ui/`. Layer-by-layer rules (incl. thin routes) → `references/coding-rules.md`.
- The permission set is derived from the spec, not invented — a missing or ambiguous code is stop-and-ask.
- Cross-module references go only via another module's `*.public.ts` (server-to-server) or `*.api.ts` (client). A token not yet declared → forward-declare a colocated `modules/<cat>/<mod>.stub.ts`; plan the reference now, the stub is mechanical at impl time (template + legend in `references/cross-module-stub.md`). `pnpm gen:coc` aggregates stubs.

## Component boundaries
- UI specific to one module lives in `modules/<cat>/<mod>/ui/`. Cross-module pure-tech helpers belong in `apps/web/lib/` (or promoted to `apps/web/commons/<mod>/` when reused). Don't drop domain UI into lib "in case of reuse."
- Detail screens with tabs: one page with tab state + per-tab components. Don't make each tab its own route.

## Routing
- Authed portal pages → `apps/web/app/(portal)/`; pre-login pages → `app/(public)/`; route handlers → `app/api/`. A new navigable page = route dir + `page.tsx` under `(portal)`.
- Plan every mutation as an `app/api/*` route handler (no server actions). The ban + enforcement → `references/coding-rules.md`.

## A-class vs B-class (decide before touching manifest)
- **A-class**: module has permission-gated UI → declare `manifest.ts` with `menuCode` + `permissions[]` → entry appears in left-nav via CoC projection.
- **B-class**: login-only UI, no permission gate (dashboards, etc.) → no manifest permissions; page calls `requireSession()` only; layout hardcodes the link. Never enters catalog or CoC projection.

## Menu and permissions (A-class only)
- `manifest.ts` declares `menuCode`, `parentMenuCode`, `entry.url`, `permissions[]`. **Does not declare `contractTypes`** — which menus each contract unlocks is human-owned in `apps/web/manifest/catalog/contract-types.ts` (`CONTRACT_MENUS`).
- `manifest.ts` is source of truth; regen / `collect.ts` wiring / never-hand-edit mechanics → `references/coding-rules.md`.
- `permissions[].code` is 4-segment `<cat>.<mod>.<fn>.<action>`. **Granularity = one code per indivisible capability**: ask "would a role ever be granted/revoked JUST this?" — yes → own code; no → fold in. A capability another module owns → reference that code, don't mint one. No code for backend-only steps or out-of-scope items.
- **Inbound stubs (codes others forward-declared against you)** — before finalizing `permissions[]`, surface any `*.stub.ts` naming this module as `@stub-owner` (`pnpm lint`'s `stub-notice` lists every stub's owner). Each is a code another module is already building against and expects you to own — declare those for real here (legend → `references/cross-module-stub.md`).
- Who may use which code is human-owned in `apps/web/manifest/catalog/roles.ts` — AI does not auto-fill it.
- `commons/<mod>/` is the leaf layer: no `menuCode`/`parentMenuCode`, never calls a business module. See `.claude/docs/coc-declaration.md` for the full CoC how-to.

## Shared packages
- Which `@cloud/*` packages get touched? List them. Available: `api-kit`, `cache`, `config`, `constants`, `db`, `i18n`, `log`, `mail`, `permissions`, `platform-config`, `request`, `security`, `storage`, `ui`.
- Touching `@cloud/permissions` (guards/sessions) or `@cloud/db` schema? Flag for teammate review.
- Anything reused twice that could go into a shared package? Flag it — new shared-package additions need explicit approval before execution.

## Provided test cases (when supplied as the acceptance set)
- Treat as **exhaustive** — transcribe every case as a planned test (level per picker below). Never summarize, sample, or drop a case.
- A case no module can satisfy is a gap — surface it, don't quietly omit.
- A case that contradicts another input (schema, spec rule) is an open decision — flag it for the human; never silently pick a winner.

## Test level

Pick the lowest rung that exercises real behavior:

| Behavior | Level |
|---|---|
| Pure function, Zod schema, service over an injected mock repo | Unit (Vitest, `pnpm test`) |
| Service + real schema/policy, or repository against a real test DB | Integration (Vitest, `pnpm test`) |
| Cross-party scoping (see Authorization negatives below) | Service/repository test asserting the `where: { partyId }` scope (Vitest) |
| Login / logout / role-gated redirect / full-stack page flow | e2e (Playwright spec under `e2e/`, `pnpm test:e2e`) |

### Authorization negatives (required for every owner-scoped table)

Plan these as required Vitest service/repository acceptance tests (tenancy mechanics → `references/coding-rules.md`):

- **list scoping** — a query as party A returns only A's rows, never B's (assert contents, not status).
- **resource denial** — a lookup of party B's row id while scoped to A returns empty/denied.
- **fail-closed** — a query with no `currentPartyId` must not leak across parties.
