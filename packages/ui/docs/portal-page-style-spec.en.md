# Portal Page Style Spec — List / Create / Detail

> The **default patterns and design constraints** for the three basic portal page shapes (list → create → detail). This is not a pixel-copy checklist: read the page task first, then choose the right pattern. Older pages that conflict with these baseline constraints should converge over time. 中文版：[portal-page-style-spec.zh-CN.md](./portal-page-style-spec.zh-CN.md).
>
> **Compilable templates** (style-only skeletons, excluded from the bundle, ready to read or copy): [examples/list-page.tsx](./examples/list-page.tsx) · [examples/create-form.tsx](./examples/create-form.tsx) · [examples/create-wizard.tsx](./examples/create-wizard.tsx) · [examples/detail-page.tsx](./examples/detail-page.tsx).
>
> Baseline rules: `@cloud/ui` primitives + semantic tokens only (`surface/content/line/success/warning/error/info` plus the `teal/violet` category hues). No hex colors, no arbitrary font sizes, no arbitrary spacing, and no arbitrary radius values; every clickable element gets `cursor-pointer`.
>
> **Snap to the scale, don't reproduce raw values.** A prototype hands you exact pixels (a `459px` modal, a `13px` gap, an off-palette grey); those are *intent*, not literals to copy. When a prototype value lands between two sanctioned tokens, snap to the **nearest** one, and use the primitive's prop / a scale class, never a hand-written arbitrary value (`max-w-[459px]`, `gap-[13px]`, `bg-[#…]`). Example: a 459px modal → `<Modal size="md">` (480px, nearest), **not** `size="sm"` (360px) and **never** `className="sm:max-w-[459px]"`.
>
> **Inherit first, adapt by task.** Default pages inherit the standard layout and density below. You may adapt content — copy, fields, which cards / columns appear — and you may choose another documented pattern when the task materially differs. Do not hand-write off-scale spacing or restyle primitives to match a prototype; when a page deviates from a default pattern, it must still use `@cloud/ui` primitives, semantic tokens, and defined density / size scales, and the reason should be recorded per §0.3.

---

## 0. How To Use This Spec

Rules are split into four levels so one exemplar page does not get mechanically copied into every page:

| Level | Meaning | Examples |
|---|---|---|
| **MUST** | Design-system and accessibility baseline; do not break | Semantic tokens, `@cloud/ui` primitives, danger variants for destructive actions, `aria-label` on icon-only buttons, selected beats hover |
| **SHOULD** | Default portal-management behavior unless the task clearly does not fit | List pages use `PageHeader` + condition band + `Table` card; detail pages prefer `PageHeaderBand`; create/edit pages prefer single-step forms |
| **MAY** | Conditional capabilities | Stat cards / quick-filters, detail tabs, right sticky summary rail, done step |
| **AVOID** | Usually avoid; explain first if needed | Arbitrary sizes/colors, copying prototype CSS, bypassing primitives for visual similarity |

### 0.1 Pattern Selection

Read the prototype's page intent and interaction semantics first, then apply the relevant section. A prototype block that looks like a stat card may be pure stats or may be a filter entry; implementation must preserve that semantic difference instead of making every tile clickable.

1. **Is this a resource-management page?**
   - Yes: prefer the `PageHeader` / `PageHeaderBand` family.
   - No: consider `ContentHeader` or a task-specific workbench layout; do not force list / create / detail.
2. **Is this a collection page?**
   - Search / filter condition bands are sticky by default so users can adjust conditions after scrolling. Keep them in normal flow only for short lists, embedded lists, or pages where filtering is not a core operation.
   - Prototype stat card is just overview data: use `StatCard` in display-only mode, without `onClick`.
   - Prototype stat card filters or switches state: use interactive `StatCard`; derive `selected` from the applied filter.
   - Multi-select / bulk action flow: use `Table` selected state + a bulk-action area; do not put bulk actions in every row.
3. **Is this a create / edit page?**
   - Independent fields: single-step form.
   - Sequential dependency, branching, upload / scan / confirm: multi-step wizard.
   - Very small contextual edit: modal form.
   - Bulk import, async processing, or long-running flow: dedicated flow page or wizard, not a normal modal.
4. **Is this a record detail page?**
   - Only 1-2 core sections: use a plain overview page; tabs are unnecessary.
   - Multiple peer sections: use same-page tabs.
   - Heavy section, independent URL, permission boundary, or loading boundary: sub-routes are allowed; record the reason.

### 0.2 Density Selection

Default to **standard density**: page bodies use `PageBody`; card interiors use `p-5 / gap-5`. Choose another density only when the task shape changes:

- **compact density**: high-frequency operation tables, audit logs, permission matrices, dense settings. Use existing spacing tokens only; do not hand-write arbitrary values.
- **focused density**: single-task forms, uploads, approval confirmations, or pages that need fewer distractions. Still use existing page padding / Card / Modal scales.

Without a clear task reason, return to standard density.

### 0.3 Deviation Rules

A page may deviate from a `SHOULD` default only when all of these hold:

- the page task is materially different from ordinary CRUD list / create / detail;
- the default layout would reduce scanning, input, or operation efficiency;
- the deviation still uses `@cloud/ui` primitives, semantic tokens, and defined size / density scales;
- deviations that affect future reuse are recorded near the component or in `DEV_NOTE.md`, not only in temporary discussion.

### 0.4 Color Tokens

Color usage follows the variables in `packages/ui/src/components/styles/index.css`; pages consume them through generated semantic utilities such as `bg-surface-1`, `text-content-primary`, `border-line-default`, `bg-success-bg`, and `text-error-strong`. Do not write raw hex, raw OKLCH, or page-local CSS variables for colors.

| Role | Use |
|---|---|
| Primary / CTA | Use `Button variant="primary"` or the `primary-*` scale only for the main action. A screen has one primary CTA. |
| Accent | `accent-*` is reserved for charts and AI-specific emphasis. Do not use accent colors for buttons or ordinary status. |
| Semantic status | Use `success-*`, `warning-*`, `error-*`, and `info-*` for Badge / Pill / inline alert states. Do not use semantic colors as decorative page chrome. |
| Surfaces | Use `surface-1` for page background, `surface-2` for cards/bands, `surface-3` for muted blocks, `surface-hover` / `surface-active` for interaction. |
| Content | Use `content-primary`, `content-secondary`, `content-tertiary`, `content-disabled`, `content-on-primary`; do not invent grey values. |
| Lines / focus | Use `line-subtle`, `line-default`, `line-strong`, and `line-focus`; focus treatment comes from the primitive / `shadow-focus` and must not be removed. |
| Category hues | Use `teal-*` / `violet-*` only for category labels where semantic status would be misleading. |

No gradients or decorative background images on portal management pages. Dark mode is supplied by the same variables under `.dark` / `[data-theme="dark"]`; pages must not hard-code separate dark-mode colors.

### 0.5 Radius Tokens

Radius follows the six-step scale from `packages/ui/src/components/styles/index.css`. Use the primitive's own size/radius defaults first; when custom layout needs a radius, use the generated radius utility for the matching token.

| Token | Utility | Use |
|---|---|---|
| `--radius-sm` = 4px | `rounded-sm` | Tags, kbd, checkboxes |
| `--radius-md` = 6px | `rounded-md` | Buttons, inputs, selects, icon buttons, search fields |
| `--radius-lg` = 8px | `rounded-lg` | In-card notices, small icon blocks, segmented controls, nested small blocks |
| `--radius-xl` = 12px | `rounded-xl` | Cards, modals, drawers, table containers, stat cards |
| `--radius-2xl` = 16px | `rounded-2xl` | Large feature cards, used sparingly |
| `--radius-full` | `rounded-full` | Pills, avatars, status dots |

Do not introduce in-between one-off radii such as 5px, 7px, 9px, 10px, 11px, 14px, or 18px. The 6px control radius and 12px container radius are an intentional hierarchy.

Small tag chips are rendered with `Badge shape="tag"` rather than a separate Tag component. Status and pill labels keep the default `shape="pill"`.

---

## 1. Page Skeletons

The shell `Layout` scroll area is **unpadded** — each page owns its padding. Default page bodies use `PageBody` from `@cloud/ui/components/layout`: it centralizes portal management page-level padding and block gap, and currently equals `flex flex-col gap-6 px-6 pt-6 pb-8`. When the padding must live on another primitive, reuse `PAGE_BODY_PADDING_CLASS_NAME`.

Below are the default management-page skeletons; first check whether §0 applies.

### 1.1 List Page

```tsx
<>
  <PageHeader title description actions={<Button variant="primary" iconLeft={<Plus/>}>New …</Button>} />
  <PageBody>
    {/* ① Stat cards / quick-filters: clickable only when the prototype semantics say so */}
    {/* ② condition band: toolbar + applied filters; sticky by default on list pages — see §5 */}
    {/* ③ list card: count band + Table + pagination */}
  </PageBody>
</>
```

### 1.2 Create Page

Two main shapes: ordinary "new / edit" pages use the **single-step form**; use a **multi-step wizard** when input has sequential dependency, branching, upload / scan / confirm. Very small contextual edits can use modal forms; bulk import and async flows should not be squeezed into a normal form.

**Single-step form (default)** — Cancel and Submit both live in the sticky header; the body is one centered column of section cards. No footer, no right summary rail, no done step.

```tsx
<>
  <PageHeader
    sticky
    title description
    actions={<>
      <Button variant="ghost" iconLeft={<X/>}>Cancel</Button>
      <Button variant="primary" iconLeft={<Plus/>} loading={pending}>Create …</Button>
    </>}
  />
  <PageBody>
    <div className="mx-auto flex max-w-3xl flex-col gap-6">{/* Card elevation={1} section cards */}</div>
  </PageBody>
</>
```

**Multi-step wizard** — only when the input is sequential / branching.

```tsx
<>
  <PageHeader title description actions={<Button variant="ghost" iconLeft={<X/>}>Cancel</Button>} />
  <PageBody>
    <StepIndicator className="rounded-xl border border-line-default bg-surface-2 px-5.5 py-4 shadow-1" … />
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">{/* current step card + error banner + footer nav */}</div>
      {/* right sticky summary rail (300px); steps needing full width simply don't render it */}
    </div>
  </PageBody>
</>
```

### 1.3 Detail Page

Default to one page + Tabs. If a tab is heavy, needs an independent URL, permission boundary, or independent loading boundary, sub-routes are allowed; record the reason per §0.3.

```tsx
<Tabs value={tab} onValueChange={…} className="gap-0">
  <PageHeaderBand tabs={<TabsList className="shadow-none">…</TabsList>}>
    <DetailHeader … />
  </PageHeaderBand>
  <TabsContent value="…" className={PAGE_BODY_PADDING_CLASS_NAME}>…</TabsContent>
</Tabs>
```

The server `page.tsx` stays a thin entry: guard (`requirePermissions`) → fetch → render the client view. No layout markup in it.

---

## 2. Page Header

### 2.1 Full-Bleed White Band

`PageHeaderBand`: `bg-surface-2` + `border-b border-line-subtle`, inner `px-6 py-4`; sits flush under the topbar, spanning edge to edge. The `tabs` slot renders on the band's bottom edge (`flex px-6`) — pass a line-variant `TabsList` (the default) with `shadow-none` so the tab underline merges with the band border. The header-band tab strip stands **~42px** tall; this height expectation applies to tabs attached to `PageHeaderBand`, not every standalone `Tabs` instance. The height is padding-driven by the line variant, not a fixed `h-*`; if a page needs it exact, size the consumer — don't retune the shared `Tabs` primitive.

> **Source & selection rule.** Both `PageHeader` (list / create header, §2.2) and `PageHeaderBand` (detail header, §2.3) live in `@cloud/ui/components/layout`. Portal management pages (list / create / detail) default to these full-bleed bands — flush under the topbar, `text-2xl`. Plain in-content title pages (dashboard, settings) use `ContentHeader` from the same package instead; it is an in-flow `text-3xl` title, not a band.

### 2.2 List / Create Header (`PageHeader`)

- Row container: `flex flex-wrap items-end gap-x-4 gap-y-3`
- Title: `h1` `text-2xl font-semibold tracking-tight text-content-primary`; inline status chip sits at `gap-2.5`
- Description: `mt-1.5 max-w-3xl text-sm text-content-tertiary`
- Actions: right-aligned `flex shrink-0 items-center gap-2`. By page type:
  - **List** — default one `variant="primary"` main action ("New …"). Import, export, sync, bulk approve, and other secondary actions use `secondary` / `ghost` / overflow menu by priority; do not promote everything to primary.
  - **Wizard** — one `variant="ghost"` escape action ("Cancel")
  - **Single-step form** — `ghost` Cancel and `primary` Submit together, with the band set `sticky` so Submit stays reachable while the form scrolls (§7.1)

### 2.3 Detail Header

Inside the band, no card. Layout: `flex flex-wrap items-center gap-4`, left to right.

**A back button is mandatory**: every detail page header starts with a back affordance at the far left, fixed as:

```tsx
<Button
  variant="ghost"
  size="icon-sm"
  aria-label="Back to list"
  nativeButton={false}
  render={<Link href="/manage/<list>" />}
>
  <ChevronLeft className="size-4" />
</Button>
```

- Ghost icon button (`icon-sm`) + `ChevronLeft size-4`, no text.
- Render it as a real link via `render={<Link/>}` (middle-clickable, hover-previewable) — **not** `onClick + router.push`, and **not** `router.back()`: entering from a deep link / new tab leaves `back()` with no defined destination; `href` points statically at the module's list page.
- `aria-label` is required for icon-only buttons.

| Element | Spec |
|---|---|
| Back | see the mandatory recipe above |
| Identity | logo / avatar / initial tile at `lg` size; omit if the record has none |
| Title row | `h1 text-2xl font-semibold tracking-tight` + status Badge, `gap-2.5` |
| Meta row | `mt-2 flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-content-secondary`; items use icon `size-3.5` + `gap-1` |
| Action | `Button variant="secondary"` + `shrink-0`; a single button gets no wrapper div |

Tab count chip: `ml-1 h-4 min-w-4 rounded-full bg-surface-3 px-1 text-xs font-medium text-content-tertiary`; omit when the count is 0.

---

## 3. Page Body & Spacing System

Spacing follows the `--space-*` variables in `packages/ui/src/components/styles/index.css`: `--space-1` 4px, `--space-2` 8px, `--space-3` 12px, `--space-4` 16px, `--space-5` 20px, `--space-6` 24px, plus `--space-8/10/12` for large empty states and focused moments. In page code, use `@cloud/ui` layout primitives and scale utilities (`px-6`, `gap-5`, `py-3`) instead of arbitrary values.

**Standard density** — page-body density is centralized in `PageBody`. Vertical rhythm runs **24 → 16 → 20**: large blocks 24px; sticky search band → list card tightens to **16px** (the card gets `-mt-2`, see §5 / §6); card interior is **20px** (`p-5` padding, `gap-5` stacks). This is the default portal-management density; except for compact / focused cases in §0.2, adapt content, not spacing.

Do not tune padding / gaps on one page just to squeeze or stretch content. If the page has too much content, split it into sections, tabs, pagination, or a dedicated flow instead of breaking the density scale.

| Level | Value | Notes |
|---|---|---|
| Page body | `PageBody` / `PAGE_BODY_PADDING_CLASS_NAME` | Component-owned `px-6 pt-6 pb-8` and block gap; do not hand-write page-body padding / gap in pages |
| Page gutters / column gap | `px-6` / `gap-6` (`--space-6`, 24px) | Default horizontal rhythm and large page blocks |
| Page-level block gap | built into `PageBody` (`gap-6`) | Stat cards ↔ search area; wizard blocks; detail two-column gap |
| Search band ↔ list card | **16px** (`--space-4`, `-mt-2` on the card) | Portal lists default to sticky condition bands that hug the table; rare non-sticky lists keep normal `gap-6` (§5, §6) |
| Card interior | `p-5` / `gap-5` (`--space-5`, 20px) | Default card content density |
| Card stack in a section | `gap-5` (20px) | Sibling section cards stacked on a detail tab |
| Tightly-coupled cards | `gap-3.5` (14px) | A card and its directly-related sub-card; use only where documented |
| Toolbar ↔ filter feedback | `gap-2.5` (10px) | Toolbar and feedback are one `flex flex-col gap-2.5` group |
| Dense in-card bands | `px-4 py-3` (`--space-4` / `--space-3`) | Count band, pagination band, section-card head band |
| Card head band | `px-5 py-3.5` (20px / 14px) | CardHeader `flush` head bands; use the documented utility, not arbitrary CSS |
| Stat card grid gap | `gap-3` (`--space-3`, 12px) | Stat-card grids and compact repeated metric tiles |
| Empty states | `py-8` / `py-10` / `py-12` (`--space-8/10/12`) | Larger spacing reserved for empty states and focused confirmations |
| Card slot padding | from Card `size` (md = `p-5`) | Custom sizing uses `flush` + own padding; **never** fight it with `p-0` |

General principle: **every wrapper div must have a job** (spacing group / scroll / flex width constraint). A wrapper with a single child whose classes can move onto that child gets removed. Card / Button / Input roots all accept `className`; note that an `Input` with `prefix` puts `className` on the inner input, so width wrappers still matter there.

### 3.1 Row Alignment

**A row that carries a name/title at its head and an action at its tail is vertically center-aligned** (`items-center`) — the leading label and trailing action sit on the same center axis, never `items-start`. This applies wherever the shape occurs: section-card row lists (§8.2), settings/list rows with a trailing button or switch, the detail header (§2.3), and in-card head bands with `CardAction`.

Only exception: when the row head is genuinely multi-line (title + subline + meta) and the action must align to the first line, top-align the row (`items-start`). Center is the default.

### 3.2 Row-Inline Action Hover

When a row has its own hover (`hover:bg-surface-hover`) **and** carries inline action icons, each icon needs a hover state **distinct from the row's**. A default `ghost` button also hovers to `bg-surface-hover`, so on an already-hovered row its own hover is invisible. Surface tokens are solid, so the nested control must switch token:

- **Neutral action** (edit, more, …): `ghost` bumped one step — `className="hover:bg-surface-active"`.
- **Destructive action** (delete): `variant="ghost-danger"` — its hover is an `error-bg` tint and signals intent.
- Always `e.stopPropagation()` on the action's `onClick` so it doesn't fire the row's `onRowClick`; group icons in a `flex items-center` cluster. Destructive actions still confirm via a modal (§8.3).

Reference: the app-publish list table (edit + delete in the trailing column).

### 3.3 Icon-Button Actions & Destructive Intent

Two invariants apply everywhere an action appears:

- **An icon-only action button is `ghost` (neutral) or `ghost-danger` (destructive) — never `secondary` / `primary` / bordered.** A bare icon has no label, so emphasis must come from a hover token, not a filled background. A labeled row action may still use `secondary` / `primary` when it deserves weight.
- **Every destructive action carries a danger variant.** Delete / remove / revoke / terminate / reset / disconnect: icon-button form uses `variant="ghost-danger"`; text button or modal-footer form uses `variant="danger"`. Do not signal danger by tinting a neutral `ghost` or overriding the icon color inside `ghost-danger`; the variant owns the color.

### 3.4 Clickable Surface States

Any clickable surface — list row, quick-filter tile, pick-one card — earns affordance from a **background** shift, not a border alone. Border / ring may reinforce, but cannot be the only signal. Neutral surface scale steps one solid shade at a time: `surface-2` → `surface-hover` → `surface-active`.

- **Navigational** (row / card opens a detail or fires `onRowClick`, then leaves the page): rest = own bg → `hover:bg-surface-hover` → `active:bg-surface-active`. No persistent lit state.
- **Selectable / toggle** (stays lit after click — stat-card quick-filter, pick-one card, multi-select row): selected is primary-tinted and beats hover. Gate neutral hover behind `!selected`.
  - **Row inside a `Table`**: pass `state.selected`; the primitive applies selected styling. Do not hand-roll it.
  - **Free-standing tile / card**: use `border-primary-500 bg-primary-50` (stat cards add `ring-2 ring-primary-500/10`). `StatCard` owns this for quick-filters (§4).
- **Nested actions** on a hoverable row keep row-distinct hover (§3.2).

Hard rule: **selected ≠ hover.** A selected surface must not carry unconditional `hover:bg-surface-hover`.

---

## 4. Stat Cards & Quick Filters

Whether a stat card is clickable depends on prototype semantics, not on whether it visually looks like a card:

- **Pure stat**: shows totals, ratios, trends, etc.; does not change list conditions. Use `StatCard` without `onClick`, so it renders non-interactive.
- **Quick filter**: prototype click switches state / filters the list, or the business treats it as a high-frequency state entry. Use interactive `StatCard`; derive `selected` from the applied filter.
- **No stat card needed**: if the prototype has no overview area, or stats do not help decisions on this list, do not add stat cards just to match the template.

The card is `StatCard` from `@cloud/ui`; it owns styling + a11y. **Don't hand-roll stat-card classes.** The grid, card data, and toolbar/filter linkage stay in the page:

- **Grid** (page-owned): use `StatGrid` or a documented grid scale such as `grid grid-cols-3 gap-3` (or `grid-cols-2 sm:grid-cols-4` for four cards).
- **`selectedKey`** is derived from the applied filter, not stored separately; clicking a selected card clears it.
- Pass `onClick` for an interactive quick-filter; omit it for pure display.
- Standard content is `label` / `value` / `description` / `trend` / `icon`; pass `children` for custom inner layout.

```tsx
<div className="grid grid-cols-3 gap-3">
  {tiles.map((tile) => (
    <StatCard
      key={tile.key}
      selected={tile.key === selectedKey}
      onClick={() => onSelect(tile.key)}   // omit → pure display
      label={tile.label}
      value={tile.value}
      description={tile.sub}
    />
  ))}
</div>
```

Selected styling beats hover; the component guarantees it.

---

## 5. Toolbar & Applied Filters

**Apply model**: inputs mutate a draft only; results change on Search / Enter, which also resets page to 1. Pages with few filters and cheap feedback may use instant filtering, but avoid firing expensive requests on every keystroke.

**Sticky** is the portal list default: the condition band (toolbar + filter feedback, as one group) docks under the app header while the list scrolls. Short lists, embedded lists, or pages where filters are only auxiliary may keep the band in normal flow, but that is the exception.

```
sticky top-0 z-10 -mx-6 -my-3 flex flex-col gap-2.5 bg-surface-1 px-6 py-3
```

- The shell `Layout`'s `<main>` is the scrollport and the app header lives outside it, so `top-0` lands exactly under the header.
- `-mx-6` + `px-6` makes the band full-bleed; `bg-surface-1` masks table rows passing underneath.
- `py-3` gives the docked state 12px of breathing room; `-my-3` cancels it so resting rhythm remains `gap-6`.
- `z-10` is enough above table content; overlays render through portals.
- The list card below pulls up with `-mt-2`, landing search band → table at **16px**. Rare non-sticky lists do not use this negative-margin pair.

- Row container: `flex flex-wrap items-center gap-2`; every control at `sm` (28px tall).
- Search input: `prefix={<Search className="size-3.5"/>}`, wrapped in `max-w-64 flex-1`.
- Select filters: `SelectTrigger size="sm"` at fixed widths (150–200px); use the `SelectValue` render prop to show labels.
- Submit: `variant="primary" size="sm"` with the Search icon.

**Filter feedback row**:

- No filters: one-line hint in `text-xs text-content-tertiary`.
- With filters: `Active filters:` + FilterChips + `Clear all` (`ghost xs`).
- FilterChip: `rounded-full border border-primary-500/25 bg-primary-50 py-0.5 pr-1 pl-2.5 text-xs font-medium text-primary-700`, trailing `Button size="icon-xs" variant="ghost"` X for individual removal.

---

## 6. List Card

Structure: `Card elevation={1}` → count band → `Table` → pagination band. The three segments separate themselves with borders; the card adds no padding of its own. If the page uses the sticky condition band, the card carries `-mt-2`; if the page is one of the rare non-sticky lists, keep normal `gap-6`.

### 6.1 Count Band

`flex items-center justify-between gap-3 border-b border-line-subtle px-4 py-3`. Left: `text-sm text-content-secondary`, number in `font-mono font-semibold tabular-nums text-content-primary`, appending ` matching filters` (tertiary) when filtered. Right: action slot (export button, `secondary sm`).

### 6.2 Table

Prefer typed `Table<R>` (columns config) over hand-written thead/tbody.

**Common text columns should choose from these base archetypes instead of inventing new size/color combinations.** When the business needs a stable new archetype (progress, risk level, avatar group, metric comparison), decide whether it belongs in `@cloud/ui` or a module-shared column component.

| Shape | Recipe |
|---|---|
| Two-line text column (primary + subline, e.g. name) | primary `text-sm font-medium text-content-primary truncate` + subline `text-2xs text-content-tertiary truncate`, inside `min-w-0`; prepend a logo + `gap-3` when there's an identity mark |
| Single-line numeric / data-value column (dates, IDs, amounts) | `font-mono text-2xs tabular-nums text-content-secondary` |
| Single-line plain-text column | table default size + `text-content-secondary`, **no mono** |

Empty values in any text column render `—` (`text-content-tertiary`).

Remaining column conventions:

| Column | Style |
|---|---|
| Status | Badge (tone + dot) |
| Tag set | `flex flex-wrap gap-1`; render chips with `Badge shape="tag"`; empty = `—` |
| Trailing chevron | `width: 48, align: "right"`, passive `ChevronRight size-3.5 text-content-tertiary`; the whole row is the click target (`onRowClick`). If the row needs inline actions, drop the chevron and follow §3.2. |
| Actions | icon buttons use only `ghost` / `ghost-danger`; important row actions must be labeled, then may use `secondary` / `primary` |

- Pass column titles as uppercase text; the primitive applies no text-transform.
- Sorting is tri-state: asc → desc → natural order; handle `onSortChange(null)`.
- Empty state: `py-12 text-center text-sm text-content-tertiary`, with distinct copy for "no data" vs "no matches".

### 6.3 Pagination Band (`RichPagination`)

`flex flex-wrap items-center justify-between gap-3 border-t border-line-subtle px-4 py-3`:

- Left: `Rows per page` + `Select sm` (72px) + summary `Showing X–Y of Z` (`text-xs`, digits `tabular-nums`)
- Right: `Pagination` page buttons (no go-to-page input)
- Changing page size resets to page 1

---

## 7. Create Page

Two main shapes: **single-step form** (§7.1 — default for ordinary new/edit pages) and **multi-step wizard** (§7.2 — when the flow has sequence, branching, upload / scan / confirm). Very small contextual edits can use modal forms; bulk import, async processing, or long-running flows should use a dedicated page or wizard.

### 7.1 Single-Step Form

- **Sticky header**: `<PageHeader sticky … />` carries title + description and both actions — `ghost` Cancel plus `primary` Submit. Long forms default to sticky so Submit stays reachable. Ordinary single-step forms do **not** add a bottom action bar; if the task needs persistent preview, draft state, or split editing, first ask whether it is still an ordinary single-step form.
- **Body**: `PageBody` wraps `<div className="mx-auto flex max-w-3xl flex-col gap-6">` — section cards grouped by concern. No `StepIndicator`, no right summary rail, no done step.
- **Submit**: guard invalid / in-flight submits in the handler; reveal field errors on first submit; on success navigate straight to the new record's detail page.

### 7.2 Multi-Step Wizard

Use only when input has sequential dependency, branching, upload / scan / confirm, or cross-step summary. Do not switch to a wizard merely because there are many fields; many independent fields still belong in a sectioned single-step form.

- **Step indicator**: `StepIndicator` with card chrome `rounded-xl border border-line-default bg-surface-2 px-5.5 py-4 shadow-1`
- **Two columns**: `flex flex-col gap-6 lg:flex-row lg:items-start`; main column `min-w-0 flex-1`; right sticky summary rail carries `w-full lg:w-75 lg:shrink-0` (300px) + `sticky top-5`; full-width steps simply don't render it
- **Step card head**: `CardHeader flush className="px-5 py-3.5"` (14·20) + `CardTitle className="text-md"` (+ optional `CardDescription text-xs text-content-tertiary`); content uses default slot padding
- **Right sticky summary rail**: `p-4.5`; heading `text-sm font-semibold mb-3`; `dl flex flex-col gap-2 text-xs`, `dt w-20 shrink-0 text-content-tertiary`; empty values render `—`
- **Error banner**: inside the main column, `mt-3 rounded-md border border-error/30 bg-error-bg px-3 py-2 text-sm text-error-strong` + `role="alert"`
- **Footer nav**: `mt-6 flex items-center justify-between`; Back `ghost` (disabled on step 1), Continue `primary` with right chevron, final step swaps to Create `primary` with Check + `loading`
- **Done step**: centered card, `CardContent flex flex-col items-center px-8 py-10`; 72px success disc → status Badge → `text-2xl` heading → `max-w-md text-sm` body → primary CTA

Validation logic and field groups live in feature-level shared files; create pages and detail edit modals consume the same source.

---

## 8. Detail Page

Detail pages default to `PageHeaderBand` + content. Use tabs based on content: 1-2 core sections can render directly in overview; multiple peer sections use tabs; heavy sections, independent permissions, or deep-link needs may use sub-routes with a recorded reason.

### 8.1 Overview Two-Column

`flex flex-col gap-6 lg:flex-row lg:items-start`; main card `Card className="min-w-0 flex-1"`; right rail `flex w-full flex-col gap-6 lg:w-80 lg:shrink-0` (320px).

- **KV grid**: `dl grid-auto-fit-kv gap-x-8 gap-y-3.5 text-sm`; columns adapt to the card's own width. Row `flex gap-5`, `dt w-40 shrink-0 font-medium text-content-tertiary`, `dd min-w-0 flex-1`; long free-text rows get `col-span-full`; missing values render `Not provided` (tertiary).
  - Responsive auto-fit columns always go through `grid-auto-fit-*` utilities; never hand-write `grid-cols-[repeat(auto-fit,minmax(…))]`.
- **Stat card**: `Card className="gap-1 px-4 py-3.5"`; label `text-xs font-medium text-content-secondary`, value `text-2xl font-semibold leading-tight`, delta line `mt-0.5 text-xs text-content-tertiary`.
- **Sensitive fields**: when a detail page includes phone numbers, email addresses, identity numbers, secrets, or similar sensitive data, mask them by default and provide per-field Reveal (`text-xs font-medium text-info-strong hover:underline`). Wire audit / toast behavior at the business layer when revealing must be tracked. Detail pages without sensitive fields do not need Reveal just to satisfy the spec.

### 8.2 Section Cards

- Head: `CardHeader` + `CardTitle className="text-md"` (+ `CardDescription className="text-xs leading-relaxed text-content-tertiary"`); header buttons go in `CardAction`, not hand-rolled flex containers.
- Row-list content: `CardContent flush` with rows as direct children: `flex items-center gap-3~3.5 px-4~4.5 py-3~3.5 border-b border-line-subtle last:border-b-0`; leading `size-10 rounded-lg` category tile, title `text-sm font-semibold` + chips at `gap-2`, subline `text-xs`.
- Clickable rows: `role="button"` + `cursor-pointer hover:bg-surface-hover` (+ `active:bg-surface-active`). Persistent selected rows use primary tint and suppress hover while selected. Inline action clusters call `stopPropagation` and use row-distinct hover (§3.2).
- In-section empty state: `px-4~6 py-8~12 text-center text-sm text-content-tertiary`.

### 8.3 Modals

All mutations still go through route handlers. Small contextual mutations default to modals; long forms, bulk imports, async tasks, or flows that need full-page context do not belong in modals. **Width is the `Modal` `size` prop — never `className="sm:max-w-[…]"`.** The primitive owns the scale: `sm` 360 / `md` 480 / `lg` 640 / `xl` 880. Confirmations → `md`; normal modal forms → `lg`; reach for `xl` only when the body genuinely needs it. Footer is always `ghost` Cancel + the primary action; destructive actions use `variant="danger"` + `loading`.

---

## 9. Typography & Data Display

Portal typography follows the TOMS type scale. Use only **Geist** for headings/body and **Geist Mono** for data-like text; do not introduce page-local fonts. Default weights are `400 / 500 / 600`; `700` is reserved for rare emphasis. Avoid `300 / 800 / 900`.

Data-like text — IDs, serial numbers, timestamps, amounts, percentages, versions, counts, and machine identifiers — uses `font-mono tabular-nums`.

| Level | Spec | Use |
|---|---|---|
| Display | `24 / 600 / 1.15` | Page and detail titles |
| H1 | `18 / 600` | Major section titles, used sparingly |
| H2 / card head | `14 / 600` | Card titles and section-card titles |
| Body Large | `14 / 400-500` | Primary body text and main table cells |
| Body | `13 / 400` | Body copy and descriptions |
| Caption | `12 / 500` | Secondary text, helper text, labels |
| Overline | `12 / 600`, uppercase, `letter-spacing: 0.06em` | Table headers and group labels |
| Data micro | `10-11 / mono` | Dense table sublabels and compact data captions |

| Display shape | Spec |
|---|---|
| Status | `Badge tone=… dot`; terminal states may add `opacity-70~80` + `line-through` |
| Tag | `Badge shape="tag"`; mono, 4px radius, 11-12px |
| Category labels | Category hue tokens, not semantic colors |

---

## 10. Cheat Sheet

```
rule levels           MUST baseline / SHOULD default / MAY conditional / AVOID with reason
color tokens          use semantic utilities from packages/ui styles; no raw hex/OKLCH
radius scale          4/6/8/12/16/full       no in-between one-off radii
spacing scale         --space-1..6 = 4..24   --space-8/10/12 for empty/focused states
page body             PageBody              TabsContent uses PAGE_BODY_PADDING_CLASS_NAME
sticky search→card    -mt-2 → 16px hug      rare non-sticky lists keep gap-6
card interior         p-5 / gap-5 (20)      card stacks gap-5 (tight 3.5)
in-card bands         px-4 py-3             wizard card head px-5 py-3.5 (14·20)
stat cards             pure stat / quick-filter by prototype semantics
detail tabs           peer sections use tabs; heavy sections may use sub-routes with reason
condition controls    always size sm        search input max-w-64 flex-1
sticky condition band portal-list default: sticky top-0 z-10 -mx-6 -my-3 bg-surface-1 px-6 py-3
single-step form      sticky header for long forms; body mx-auto max-w-3xl column
wizard summary rail   w-75 sticky top-5     detail right rail w-80
modal size prop       sm360 md480 lg640 xl880; small mutations modal, complex flows page/wizard
empty state           py-12 centered text-sm tertiary
clickable surface     hover:bg-surface-hover  press active:bg-surface-active (§3.4)
selectable surface    selected=primary-tinted, beats hover → gate hover on !selected
```
