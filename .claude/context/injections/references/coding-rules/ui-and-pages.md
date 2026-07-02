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

## Client components & data fetching

- Interactive components MUST start with `'use client'`.
- Client-side data goes through the module's `client/<mod>.api.ts` (named functions over `@cloud/request/client`) — never inline `prisma`, never raw `fetch`.
- Gate **display** of buttons/sections client-side with `useCan(check)` or `<Can all=[...] />` from `@cloud/permissions/client`. Display gating is UX only; the server route still enforces `assertPermissions` (铁律). Build the button 显隐 / interaction last (默认开发链路 6).

## Component placement

- Colocate module components in `ui/components/`, one file per business block (`user-list-item.tsx`, `new-user-modal.tsx`, `user-detail.tsx` …).
- Cross-app reusable primitives come from `@cloud/ui`; do not fork or re-implement them in a module.
- Module UI MUST NOT deep-import another module's internals — cross-module types flow through `server/<mod>.public` / `client/<mod>.api` (铁律 8).

## Portal page-style spec (binding rules)

Binding style for `@cloud/ui` portal pages (list / create / detail). Severity tiers: **MUST** (design-system / a11y baseline, never break) · **SHOULD** (backoffice default, deviate only when the task clearly differs) · **MAY** (conditional) · **AVOID** (needs justification). For concrete per-page skeletons, copy from the compilable examples (code, so they stay current): `packages/ui/docs/examples/list-page.tsx`, `list-page-advanced-filter.tsx`, `create-form.tsx`, `create-wizard.tsx`, `detail-page.tsx`.

**Page mode & density.** First read the prototype's intent, then pick the mode — don't unify visually-similar blocks into one behavior. Resource-management pages use the `PageHeader` / `PageHeaderBand` family; plain content pages (dashboard / settings) use `ContentHeader`. Default **standard** density (body via `PageBody`, card internals via `Card`); switch to **compact** (dense op-tables / logs / matrices) or **focused** (single-task forms / confirmations) only when the task form changes. Deviation gate — deviate from a SHOULD default only when ALL hold: (1) task clearly differs from ordinary CRUD; (2) the default layout would hurt scanning / entry / operation; (3) the deviation still uses primitives + semantic tokens + existing size/density scale; (4) reuse-affecting deviations are noted in a comment near the component.

**Tokens & values (MUST).** Use `@cloud/ui` primitives with semantic tokens (`surface/content/line/success/warning/error/info`). MUST NOT write hex, OKLCH, or arbitrary values (`max-w-[459px]`, `bg-[#…]`) — snap prototype pixels to the nearest scale token / primitive prop (459px modal → `Modal size="md"`). Clickable elements MUST have `cursor-pointer`.

**Shell & spacing.** The `Layout` scroll area carries no padding; page body goes through `PageBody` (owns page-level padding + block gap; reuse `PAGE_BODY_PADDING_CLASS_NAME` if padding must live elsewhere) — do not hand-write page-level padding. Page-level block gap and card padding are built-in; you only write gaps *between* cards/components, via `--space-*` scale classes (multiples of 4), never arbitrary values: side-by-side block cards `gap-5`; tightly-coupled parent↔child cards `gap-3.5`; condition band↔list card `gap-4` (sticky) / `gap-6` (short/embedded); stat-card grid `gap-3`. Adjust content, not spacing — split into blocks / tabs / pagination when content overflows. Custom card padding via `flush` + built-in padding, never `p-0`. Every wrapper div MUST have a responsibility (spacing group / scroll / flex width) — drop single-child wrappers whose class merges into the child.

**Clickable-surface states.** Feedback comes from **background** change, not a lone border/ring. Navigational rows/cards (click leaves the page) get hover + press feedback, no lit state. Selectable/toggle surfaces use `Toggle` or `Button` (never a hand-rolled clickable div); selected state uses the primary tone and MUST override hover — **hard rule: selected ≠ hover**. Inline-action hover MUST be distinct from row hover and MUST NOT trigger the row's navigation. Icon actions are neutral or danger tone only (no fill/stroke emphasis); danger actions (delete / remove / undo) MUST carry danger semantics via the variant, not manual coloring.

**Page headers.** List / create use `PageHeader` (title / description / actions props); detail uses `PageHeaderBand`; plain content pages use `ContentHeader`. The `tabs` slot renders a line-variant `TabsList` + `shadow-none` (underline meets band edge). One `variant="primary"` CTA per screen — secondary actions do not steal primary. Detail back-button (if any) sits far-left: `Button variant="ghost" size="icon-sm"` + `ChevronLeft`, no text, `aria-label` required.

**Lists.** MUST use the shared family, page only supplies fields: `ListConditionBand` + `SearchInput` + `AppliedFilters` + `FilterChip` driven by `useListFilters` (draft/applied state machine); advanced filter via `AdvancedFilterButton` + `AdvancedFilterSheet` (+ `AdvancedFilterGroup` / `AdvancedFilterField`). Results live in `Card elevation={1}` wrapping count band → table → footer. Count band is `ListSummaryBar` (mono count, `label` appends ` matching filters` when filtered; sticky lists set the table's `stickyHeaderTop={LIST_SUMMARY_BAR_HEIGHT}`). Table is a typed `Table<R>` (columns config) — never hand-write thead/tbody. Footer is `RichPagination` — never hand-roll page/size/range. Column recipes: two-line text (`text-sm font-medium` main + `text-2xs text-content-tertiary` sub, outer `min-w-0`); numeric/id/date columns `font-mono text-2xs tabular-nums`; empty cells `—`; badge sets `flex flex-wrap gap-1`; trailing chevron column `align:"right"` + passive `ChevronRight` with the whole row as `onRowClick` target; action column icon buttons `ghost` / `ghost-danger` only; empty state via the `Empty` component (`Table`'s `empty` prop, title distinguishes "no data" vs "no filter match").

**Create pages.** Single-step form (default for independent fields) — `PageHeader` + centered column of block cards, sticky header so Submit stays reachable; see `create-form.tsx`. Wizard (only for meaningful staged flows: dependency / branch / review / external processing) — step indicator, sticky bottom nav, optional summary bar; see `create-wizard.tsx`. Many-but-independent fields stay a single-step form.

**Detail.** `PageHeaderBand` + content; 1-2 core blocks lay out overview directly, multiple sibling blocks use same-page tabs, heavy/independently-permissioned blocks may split to a sub-route (note the reason). Overview KV grids use the `KvGrid` component (the `grid-auto-fit-kv` class) — columns auto-fit by card width, never viewport breakpoints, never hand-written `grid-cols-[repeat(auto-fit,minmax(…))]` (arbitrary-value lint bans it).

**Color / Badge.** Colors go through semantic utility classes only — no raw hex, OKLCH, or page-local color vars; dark mode via same-named `.dark` / `[data-theme]` variables, not hardcoded. Semantic `tone` (`success/warning/error/info-*`) is reserved for status/severity Badges and inline hints; info/category/plain fields use `Badge tone="neutral"`. `accent-*` is charts/AI only. `Badge` supports `dot` and `shape="tag"`. Never remove focus rings; no gradient/decorative backgrounds on portal pages.

**Typography.** Geist for text, Geist Mono (`font-mono tabular-nums`) for data reads (ids / timestamps / amounts / counts / versions). Weights `400/500/600`; `700` rare, avoid `300/800/900`. Page/detail title `text-2xl font-semibold tracking-tight`; block card title `text-md` (`CardTitle` default); body/row title `text-sm`; sub/overline `text-xs` / `text-2xs`.

**Sidebar (MUST).** Three levels (see `app/(dashboard)/layout.tsx`): L1 group heading (no icon), L2 sidebar item (has icon), L3 nested child (no icon); directory nodes in `manifest/catalog/menu-tree.ts`. Every L2 menu's `icon` name (declared in `manifest.ts`) MUST have a matching case in `apps/web/app/(dashboard)/_components/menu-icon.tsx`'s `getMenuIcon` — it MUST NOT fall through to the `LayoutDashboard` default. Icons come from `lucide-react`.
