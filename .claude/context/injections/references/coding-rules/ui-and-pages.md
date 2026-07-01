# UI & pages

## Route file (`app/**/page.tsx`)

- A `page.tsx` under `app/` **only registers the route** and re-exports the module's page component from `ui/<page>.tsx`. One line, no logic:
  `export { UsersPage as default } from "@/modules/system/users/ui/users-page";`
- MUST NOT hold business logic, data fetch, auth, or JSX in the route file — it is the thin route layer (per AGENTS.md 目录语义). Business lives in `modules/<cat>/<mod>/ui/`.
- Route-group dirs classify the shell: authed portal pages under `(dashboard)`, unauthenticated ones (login / reset / 403) under `(portal)`.

## RSC page component (`ui/<page>.tsx`)

- The `ui/<page>.tsx` re-exported by the route is an **async React Server Component** (no `'use client'`). It:
  1. **Authorizes first** — `requirePermissions({ all: [...] })` for permission-gated pages, or `requireSession()` for login-only pages. Both from `@cloud/permissions/server`. Use `PermissionCode` literals, never bare strings (铁律 2).
  2. Reads via the module's **service / `*.public`** using `session.currentPartyId` (铁律 6) — MUST NOT touch `prisma` here.
  3. Passes fetched data down as props to a `'use client'` component; renders no interactive state itself.
- See [auth-guards](auth-guards.md) for guard placement, [i18n](i18n.md) for `getTranslations`.

## Client components & data fetching

- Interactive components MUST start with `'use client'`.
- Client-side data goes through the module's `client/<mod>.api.ts` (named functions over `@cloud/request/client`) — never inline `prisma`, never raw `fetch` (see [api-and-requests](api-and-requests.md)).
- Gate **display** of buttons/sections client-side with `useCan(check)` or `<Can all=[...] />` from `@cloud/permissions/client`. Display gating is UX only; the server route still enforces `assertPermissions` (铁律). Build the button 显隐 / interaction last (默认开发链路 6).

## Component placement

- Colocate module components in `ui/components/`, one file per business block (`user-list-item.tsx`, `new-user-modal.tsx`, `user-detail.tsx` …).
- Cross-app reusable primitives come from `@cloud/ui`; do not fork or re-implement them in a module.
- Module UI MUST NOT deep-import another module's internals — cross-module types flow through `server/<mod>.public` / `client/<mod>.api` (铁律 8).

## Portal page-style spec (binding rules)

Grounded in `.claude/docs/portal-page-style-spec.md` — the binding constraints; defer pixel detail and per-page-type skeletons to the See-also doc.

- **Primitives + semantic tokens only (MUST).** Use `@cloud/ui` primitives with semantic tokens (`surface/content/line/success/warning/error/info`). MUST NOT write hex, OKLCH, or arbitrary values (`max-w-[459px]`, `bg-[#…]`) — snap prototype pixels to the nearest scale token / primitive prop. Clickable elements MUST have `cursor-pointer`.
- **Shell padding (MUST).** The `Layout` scroll area carries no padding; page body goes through `PageBody` (owns page-level padding + block gap) — do not hand-write page-level padding (reuse `PAGE_BODY_PADDING_CLASS_NAME` when it must live elsewhere).
- **Page headers.** Backoffice list/create use `PageHeader`; detail uses `PageHeaderBand`; plain content pages (dashboard/settings) use `ContentHeader`. One `variant="primary"` CTA per screen; secondary actions do not steal primary.
- **Spacing.** Only `--space-*` scale classes (multiples of 4); never arbitrary values. Adjust content, not spacing — split into blocks/tabs/pagination when content overflows.
- **Lists.** Use the shared family — `ListConditionBand` + `SearchInput` + `AppliedFilters` + `FilterChip` with `useListFilters`; typed `Table<R>` (no hand-written thead/tbody); `ListSummaryBar` count band; `RichPagination` footer. MUST NOT hand-roll condition bars, tables, or page/size footers.
- **Detail.** `PageHeaderBand` + content; overview KV grids use `grid-auto-fit-*` (auto-fit by card width, not viewport breakpoints).
- **Color/Badge tone.** Semantic `tone` (`success/warning/error/info`) is reserved for status/severity; info/category/plain fields use `Badge tone="neutral"`. `accent-*` is charts/AI only. Never remove focus rings; no gradient/decorative backgrounds on portal pages.
- **Typography.** Follow the type scale — Geist for text, Geist Mono (`font-mono tabular-nums`) for data reads (ids/timestamps/amounts/counts). Weights `400/500/600`; `700` rare.
- **Sidebar L2 icon (MUST).** Every L2 menu's `icon` name (declared in `manifest.ts`) MUST have a matching case in `apps/web/app/(dashboard)/_components/menu-icon.tsx`'s `getMenuIcon` — it MUST NOT fall through to the `LayoutDashboard` default.

See also (deep spec): `.claude/docs/portal-page-style-spec.md`.
