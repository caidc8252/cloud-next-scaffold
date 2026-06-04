# Portal Page Style Spec — List / Create / Detail

> The unified style spec for the three basic portal page shapes (list → create → detail), distilled from the exemplar module `apps/web/app/(portal)/manage/customers`. Read this before building any of these three page types in any module; older pages that diverge should converge toward it over time. 中文版：[portal-page-style-spec.zh-CN.md](./portal-page-style-spec.zh-CN.md).
>
> **Compilable templates** (style-only skeletons, excluded from the bundle, ready to read or copy): [examples/list-page.tsx](./examples/list-page.tsx) · [examples/create-form.tsx](./examples/create-form.tsx) · [examples/create-wizard.tsx](./examples/create-wizard.tsx) · [examples/detail-page.tsx](./examples/detail-page.tsx).
>
> Baseline rules: `@cloud/ui` primitives + semantic tokens only (`surface/content/line/success/warning/error/info` plus the `teal/violet` category hues). No hex colors, no arbitrary font sizes; every clickable element gets `cursor-pointer`.

---

## 1. Page Skeletons

The shell `Layout` scroll area is **unpadded** — each page owns its padding. The three page shapes:

### 1.1 List page

```tsx
<>
  <PageHeader title description actions={<Button variant="primary" iconLeft={<Plus/>}>New …</Button>} />
  <div className="flex flex-col gap-6 px-6 pt-6 pb-8">
    {/* ① KPI quick-filter tiles */}
    {/* ② condition band: toolbar + applied filters (one group, gap-2.5 inside; the whole band is sticky — see §5) */}
    {/* ③ list card: count band + Table + pagination */}
  </div>
</>
```

### 1.2 Create page

Two shapes — use the **single-step form** for plain "new" / "edit" pages (most of them); reserve the **multi-step wizard** for flows that are genuinely sequential or branch.

**Single-step form (default)** — Cancel **and** Submit both live in a **sticky header**; the body is one centered column of section cards. No footer, no summary rail, no done step.

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
  <div className="px-6 pt-6 pb-8">
    <div className="mx-auto flex max-w-3xl flex-col gap-6">{/* Card elevation={1} section cards */}</div>
  </div>
</>
```

**Multi-step wizard** — only when the input is sequential / branching.

```tsx
<>
  <PageHeader title description actions={<Button variant="ghost" iconLeft={<X/>}>Cancel</Button>} />
  <div className="flex flex-col gap-6 px-6 pt-6 pb-8">
    <StepIndicator className="rounded-xl border border-line-default bg-surface-2 px-5.5 py-4 shadow-1" … />
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">{/* current step card + error banner + footer nav */}</div>
      {/* summary rail (300px); steps needing full width simply don't render it — the flex-1 column spans */}
    </div>
  </div>
</>
```

### 1.3 Detail page

One page + Tabs — **no sub-routes per tab**.

```tsx
<Tabs value={tab} onValueChange={…} className="gap-0">
  <PageHeaderBand tabs={<TabsList className="shadow-none">…</TabsList>}>
    <DetailHeader … />
  </PageHeaderBand>
  <TabsContent value="…" className={TAB_BODY_CLASS}>…</TabsContent>  {/* TAB_BODY_CLASS = "px-6 pt-6 pb-8" */}
</Tabs>
```

The server `page.tsx` stays a thin entry: guard (`requirePermissions`) → fetch → render the client view. No layout markup in it.

---

## 2. Page Header

### 2.1 Full-bleed white band (shared container)

`PageHeaderBand`: `bg-surface-2` + `border-b border-line-subtle`, inner `px-6 py-4`; sits flush under the topbar, spanning edge to edge. The `tabs` slot renders on the band's bottom edge (`flex px-6`) — pass a line-variant `TabsList` (the default) with `shadow-none` so the tab underline merges with the band border.

> **Source & selection rule.** Both `PageHeader` (list / create header, §2.2) and `PageHeaderBand` (detail header, §2.3) live in `@cloud/ui/components/layout`. Use these full-bleed bands for portal management pages (list / create / detail), which dock flush under the topbar at `text-2xl`. For a plain in-content page title (e.g. dashboard, settings) use `ContentHeader` from the same package instead — it's an in-flow `text-3xl` title, not a band.

### 2.2 List / create header (`PageHeader`)

- Row container: `flex flex-wrap items-end gap-x-4 gap-y-3`
- Title: `h1` `text-2xl font-semibold tracking-tight text-content-primary`; inline status chip sits at `gap-2.5`
- Description: `mt-1.5 max-w-3xl text-sm text-content-tertiary`
- Actions: right-aligned `flex shrink-0 items-center gap-2`. By page type:
  - **List** — one `variant="primary"` action ("New …")
  - **Wizard** — one `variant="ghost"` escape action ("Cancel")
  - **Single-step form** — `ghost` Cancel **and** `primary` Submit together, with the band set `sticky` so Submit stays reachable while the form scrolls (§7.1)

### 2.3 Detail header (inside the band, no card)

`flex flex-wrap items-center gap-4`, left to right:

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

- Ghost icon button (`icon-sm`) + `ChevronLeft size-4`, no text
- Render it as a real link via `render={<Link/>}` (middle-clickable, hover-previewable) — **not** `onClick + router.push`, and **not** `router.back()`: entering the detail page from a deep link / new tab leaves `back()` with no defined destination; `href` points statically at the module's list page
- `aria-label` is required (icon-only button has no readable text)

| Element | Spec |
|---|---|
| Back | see the mandatory recipe above |
| Identity | logo / avatar / initial tile at `lg` size (omit if the record has none) |
| Title row | `h1 text-2xl font-semibold tracking-tight` + status Badge, `gap-2.5` |
| Meta row | `mt-2 flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-content-secondary`; items use icon `size-3.5` + `gap-1` |
| Action | `Button variant="secondary"` + `shrink-0`; a single button gets no wrapper div |

Tab count chip: `ml-1 h-4 min-w-4 rounded-full bg-surface-3 px-1 text-xs font-medium text-content-tertiary`; omit when the count is 0.

---

## 3. Page Body & Spacing System

| Level | Value | Notes |
|---|---|---|
| Page body padding | `px-6 pt-6 pb-8` | prototype 24px edges; same on the list/wizard body div and every detail `TabsContent` |
| Page-level block gap | `gap-6` (24px) | KPI tiles ↔ search area ↔ list card; wizard blocks; detail two-column gap |
| Card stack in a section | `gap-5` (20px) | sibling section cards stacked on a detail tab |
| Tightly-coupled cards | `gap-3.5` (14px) | a card and its directly-related sub-card (e.g. a list + its collapsed history) |
| Toolbar ↔ filter feedback | `gap-2.5` (10px) | the two are grouped in one `flex flex-col gap-2.5`, then separated from neighbors by gap-6 |
| Dense in-card bands | `px-4 py-3` | count band, pagination band, section-card head band |
| Card slot padding | from Card `size` (md = `p-5`) | custom sizing uses `flush` + own padding (e.g. wizard card head `px-5 py-4`); **never** fight it with `p-0` |

General principle: **every wrapper div must have a job** (spacing group / scroll / flex width constraint). A wrapper with a single child whose classes can move onto that child gets removed (Card / Button / Input roots all accept `className`; note an `Input` with `prefix` puts `className` on the inner input — that case keeps an outer width wrapper).

---

## 4. KPI Quick-Filter Tiles

The tile itself is `KpiTile` from `@cloud/ui` (it owns the styling + a11y below). The **grid, the tile data, and the toolbar/filter linkage stay in the page** — `activeKey` is derived from the applied filter, `onClick` mutates it. Pass `onClick` for an interactive quick-filter; omit it for a pure stat.

A fixed three-column grid; each tile is itself a **clickable status filter** (click to apply, click again to clear):

```
grid grid-cols-3 gap-3
tile:    button · rounded-lg border px-4 py-3 text-left transition-colors cursor-pointer
resting: border-line-subtle bg-surface-2 shadow-1 hover:bg-surface-hover
active:  border-primary-500 bg-primary-50 ring-2 ring-primary-500/10 (label & number switch to primary-700)
label:   text-2xs font-medium tracking-wider uppercase text-content-tertiary
value row: mt-1 flex items-baseline gap-1.5
value:   font-mono text-2xl tracking-tight tabular-nums
sub:     text-2xs text-content-tertiary
```

Active styling must beat hover (no hover wash in the active state).

---

## 5. Toolbar & Applied Filters

**Apply model**: inputs mutate a draft only; results change on Search / Enter, which also resets the page to 1.

**Sticky**: the condition band (toolbar + filter feedback, as one group) docks flush under the app header while the list scrolls:

```
sticky top-0 z-10 -mx-6 -my-3 flex flex-col gap-2.5 bg-surface-1 px-6 py-3
```

- The shell `Layout`'s `<main>` is the scrollport and the app header lives outside it, so `top-0` lands exactly under the header — no offset constant needed
- `-mx-6` + `px-6` makes the band full-bleed; the canvas background `bg-surface-1` masks table rows passing underneath (without the bleed they'd peek through the 24px side gutters)
- `py-3` gives the docked state 12px of breathing room; `-my-3` cancels it so the resting rhythm stays gap-6
- `z-10` is enough to sit above table content; overlays (Select dropdowns etc.) render through portals and are unaffected

- Row container: `flex flex-wrap items-center gap-2`; every control at `sm` (28px tall)
- Search input: `prefix={<Search className="size-3.5"/>}`, wrapped in `max-w-64 flex-1`
- Select filters: `SelectTrigger size="sm"` at fixed widths (150–200px); use the `SelectValue` render-prop to show labels (base-ui shows the raw value by default)
- Submit: `variant="primary" size="sm"` with the Search icon

**Filter feedback row** (directly under the toolbar, in the gap-2.5 group):

- No filters: a one-line hint in `text-xs text-content-tertiary`
- With filters: `Active filters:` + FilterChips + `Clear all` (ghost xs)
- FilterChip: `rounded-full border border-primary-500/25 bg-primary-50 py-0.5 pr-1 pl-2.5 text-xs font-medium text-primary-700`, trailing `Button size="icon-xs" variant="ghost"` X for individual removal

---

## 6. List Card

Structure: `Card elevation={1}` → count band → `Table` → pagination band. The three segments separate themselves with borders; the card adds no padding of its own.

### 6.1 Count band

`flex items-center justify-between gap-3 border-b border-line-subtle px-4 py-3`. Left: `text-sm text-content-secondary` with the number in `font-mono font-semibold tabular-nums text-content-primary`, appending ` matching filters` (tertiary) when filtered. Right: action slot (export button, `secondary sm`).

### 6.2 Table

Prefer the typed `Table<R>` (columns config) over hand-written thead/tbody.

**Text columns come in exactly three shapes — do not invent a new size / color combo** (the customers table is the reference):

| Shape | Recipe |
|---|---|
| Two-line text column (primary + subline, e.g. name) | primary `text-sm font-medium text-content-primary truncate` + subline `text-2xs text-content-tertiary truncate`, inside `min-w-0`; prepend a logo + `gap-3` when there's an identity mark |
| Single-line numeric / data-value column (dates, IDs, amounts — e.g. registeredAt) | `font-mono text-2xs tabular-nums text-content-secondary` — digits always read as data in mono |
| Single-line plain-text column | regular body font: the table's default size + `text-content-secondary`, **no mono** |

Empty values in any text column render `—` (`text-content-tertiary`).

Remaining column conventions:

| Column | Style |
|---|---|
| Status | Badge (tone + dot) |
| Tag set | `flex flex-wrap gap-1`; empty = `—` |
| Trailing chevron | `width: 48, align: "right"`, passive `ChevronRight size-3.5 text-content-tertiary` — **the whole row is the click target** (`onRowClick`); no inline buttons |

- Pass column titles as **uppercase text** (the primitive applies no text-transform)
- Sorting is tri-state: asc → desc → natural order; handle `onSortChange(null)` (restore seed order) — never ignore it
- Empty state: `py-12 text-center text-sm text-content-tertiary`, with distinct copy for "no data" vs "no matches"

### 6.3 Pagination band (RichPagination)

`flex flex-wrap items-center justify-between gap-3 border-t border-line-subtle px-4 py-3`:

- Left: `Rows per page` + `Select sm` (72px) + summary `Showing X–Y of Z` (`text-xs`, digits `tabular-nums`)
- Right: `Pagination` page buttons (no go-to-page input)
- Changing page size resets to page 1

---

## 7. Create Page

Two shapes: a **single-step form** (§7.1 — the default for plain "new" / "edit" pages) and a **multi-step wizard** (§7.2 — only when the flow is genuinely sequential or branches).

### 7.1 Single-step form

- **Header (sticky)**: `<PageHeader sticky … />` carries the title + description **and both actions** — `ghost` Cancel (`iconLeft={<X/>}`) plus `primary` Submit (`iconLeft` = `Plus` on create / `Check` on edit, `loading` while pending). The band is sticky so Submit stays reachable as the form scrolls; it docks under the app header exactly like the list condition band (§5 — the shell `<main>` is the scrollport, so `top-0` lands under the header), and its opaque `bg-surface-2` masks content passing beneath. **There is no bottom action bar** — the header is the only action surface.
- **Body**: one centered column — `<div className="mx-auto flex max-w-3xl flex-col gap-6">` inside the `px-6 pt-6 pb-8` page padding — of `Card elevation={1}` section cards grouped by concern (Identity / Visibility / …). No `StepIndicator`, no summary rail, no done step.
- **Submit**: guard invalid / in-flight submits in the handler and surface field errors on the first attempt; on success navigate straight to the new record's detail page (`router.push`) — don't show a separate confirmation screen.
- Reference implementation: `apps/web/app/(portal)/app/app-publish/new/_components/app-form.tsx` — one component serves both create and edit via a `mode` prop.

### 7.2 Multi-step wizard

Use only when the input is sequential / branching.

- **Step indicator**: `StepIndicator` with card chrome `rounded-xl border border-line-default bg-surface-2 px-5.5 py-4 shadow-1`
- **Two columns**: `flex flex-col gap-6 lg:flex-row lg:items-start`; main column `min-w-0 flex-1`; the summary rail component carries its own `w-full lg:w-75 lg:shrink-0` (300px) + `sticky top-5`; full-width steps simply don't render the rail
- **Step card head**: `CardHeader flush className="px-5 py-4"` + `CardTitle className="text-md"` (+ optional `CardDescription text-xs text-content-tertiary`); content uses the default slot padding
- **Summary rail**: `p-4.5`; heading `text-sm font-semibold mb-3`; `dl flex flex-col gap-2 text-xs`, `dt w-20 shrink-0 text-content-tertiary`; empty values render `—`
- **Error banner**: inside the main column, `mt-3 rounded-md border border-error/30 bg-error-bg px-3 py-2 text-sm text-error-strong` + `role="alert"`
- **Footer nav**: `mt-6 flex items-center justify-between`; Back `ghost` (disabled on step 1), Continue `primary` with right chevron, final step swaps to Create `primary` with Check + `loading`
- **Done step**: centered card, `CardContent flex flex-col items-center px-8 py-10`; 72px success disc (`size-18 rounded-full border-success/25 bg-success-bg text-success-strong`) → status Badge → `text-2xl` heading → `max-w-md text-sm` body → primary CTA

Validation logic and field groups **live in feature-level shared files** (e.g. `_components/<entity>-fields.tsx` exporting an `isFieldsetValid` helper) — the create page (form or wizard) and the detail edit modal consume the same source; never duplicate the rules.

---

## 8. Detail Page

### 8.1 Overview two-column

`flex flex-col gap-6 lg:flex-row lg:items-start`; main card `Card className="min-w-0 flex-1"` (width classes go on the Card itself — no extra wrapper); right rail `flex w-full flex-col gap-6 lg:w-80 lg:shrink-0` (320px).

- **KV grid**: `dl flex flex-col gap-3.5 text-sm`; row `flex gap-5`, `dt w-40 shrink-0 font-medium text-content-tertiary`, `dd min-w-0 flex-1`; missing values render a uniform `Not provided` (tertiary)
- **Stat card**: `Card className="gap-1 px-4 py-3.5"`; label `text-xs font-medium text-content-secondary`, value `text-2xl font-semibold leading-tight`, delta line `mt-0.5 text-xs text-content-tertiary`
- **PII masking**: masked by default with per-field `Reveal` (`text-xs font-medium text-info-strong hover:underline`); revealing fires an audit-logged toast

### 8.2 Section cards (one card per related collection)

- Head: `CardHeader` + `CardTitle className="text-md"` (+ `CardDescription className="text-xs leading-relaxed text-content-tertiary"`); header buttons go in the **`CardAction`** slot (vertically centered against the text block — team spec); no hand-rolled flex containers
- Row-list content: `CardContent flush` with rows as direct children: `flex items-center gap-3~3.5 px-4~4.5 py-3~3.5 border-b border-line-subtle last:border-b-0`; leading `size-10 rounded-lg` category tile, title `text-sm font-semibold` + chips at `gap-2`, subline `text-xs`
- Clickable rows: `role="button"` + `cursor-pointer hover:bg-surface-hover`; inline action clusters call `stopPropagation`
- In-section empty state: `px-4~6 py-8~12 text-center text-sm text-content-tertiary`

### 8.3 Modals

Every mutation goes through a modal + route handler. Widths: confirmations `sm:max-w-[440px]`, forms `sm:max-w-[620px]`. Footer is always `ghost` Cancel + the primary action (destructive ones use `variant="danger"` + `loading`).

---

## 9. Typography & Data Display

| Use | Spec |
|---|---|
| Page title | `text-2xl font-semibold tracking-tight` |
| Section card title | `CardTitle className="text-md"` (14px) |
| Body / row title | `text-sm` (13px) |
| Helper text / sublines | `text-xs` (12px) |
| Overline / data captions | `text-2xs` (11px), often with `uppercase tracking-wider` |
| Counts, dates, amounts | `font-mono tabular-nums` (reads as data) |
| Status | `Badge tone=… dot`; terminal states (Terminated/Expired) may add `opacity-70~80` + `line-through` |
| Category labels | category hue tokens (teal / violet, …) — not semantic colors |

---

## 10. Cheat Sheet

```
page padding        px-6 pt-6 pb-8        block gap gap-6
in-card bands       px-4 py-3             card stacks gap-5 (tight 3.5)
condition controls  always size sm        search input max-w-64 flex-1
sticky condition band  sticky top-0 z-10 -mx-6 -my-3 bg-surface-1 px-6 py-3
single-step form    sticky header (cancel+submit)   body mx-auto max-w-3xl col, no footer
wizard rail         w-75 sticky top-5     detail rail w-80
confirm modal 440px form modal 620px      empty state py-12 centered text-sm tertiary
```
