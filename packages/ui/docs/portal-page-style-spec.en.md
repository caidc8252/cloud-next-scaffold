# Portal Page Style Spec — List / Create / Detail

> The **default patterns and design constraints** for the three basic portal page shapes (list → create → detail). This is not a pixel-copy checklist: read the page task first, then choose the right pattern. Older pages that conflict with these baseline constraints should converge over time. 中文版：[portal-page-style-spec.zh-CN.md](./portal-page-style-spec.zh-CN.md).
>
> **Compilable templates** (style-only skeletons, excluded from the bundle, ready to read or copy): [examples/list-page.tsx](./examples/list-page.tsx) · [examples/create-form.tsx](./examples/create-form.tsx) · [examples/create-wizard.tsx](./examples/create-wizard.tsx) · [examples/detail-page.tsx](./examples/detail-page.tsx).
>
> Baseline rules: `@cloud/ui` primitives + semantic tokens only (`surface/content/line/success/warning/error/info` plus the `teal/violet` category hues). No hex colors, no arbitrary font sizes, no arbitrary spacing, no arbitrary width / height, and no arbitrary radius values; every clickable element gets `cursor-pointer`.
>
> **Snap to the scale, don't reproduce raw values.** A prototype hands you exact pixels (a `459px` modal, a `180px` select, a `13px` gap, an off-palette grey); those are *intent*, not literals to copy. When a prototype value lands between two sanctioned tokens, snap to the **nearest** one, and use the primitive's prop / a scale class, never a hand-written arbitrary value (`max-w-[459px]`, `w-[180px]`, `gap-[13px]`, `bg-[#…]`). Example: a 459px modal → `<Modal size="md">` (480px, nearest), **not** `size="sm"` (360px) and **never** `className="sm:max-w-[459px]"`.
>
> **Inherit first, adapt by task.** Default pages inherit the standard layout and density below. You may adapt content — copy, fields, which cards / columns appear — and you may choose another documented pattern when the task materially differs. Do not hand-write off-scale spacing or restyle primitives to match a prototype; when a page deviates from a default pattern, it must still use `@cloud/ui` primitives, semantic tokens, and defined density / size scales, and the reason should be recorded per §0.3.

---

## 0. How To Use This Spec

Rules are split into four levels so one exemplar page does not get mechanically copied into every page:

| Level | Meaning | Examples |
|---|---|---|
| **MUST** | Design-system and accessibility baseline; do not break | Semantic tokens, `@cloud/ui` primitives, danger variants for destructive actions, `aria-label` on icon-only buttons, selected beats hover |
| **SHOULD** | Default portal-management behavior unless the task clearly does not fit | List pages use `PageHeader` + condition band + `Table` card; detail pages prefer `PageHeaderBand`; create/edit pages prefer single-step forms |
| **MAY** | Conditional capabilities | Detail tabs, optional summary rail, completion state |
| **AVOID** | Usually avoid; explain first if needed | Arbitrary sizes/colors, copying prototype CSS, bypassing primitives for visual similarity |

### 0.1 Pattern Selection

Read the prototype's page intent and interaction semantics first, then apply the relevant section. Preserve the prototype's interaction semantics instead of making visually similar blocks behave the same way.

1. **Is this a resource-management page?**
   - Yes: prefer the `PageHeader` / `PageHeaderBand` family.
   - No: consider `ContentHeader` or a task-specific workbench layout; do not force list / create / detail.
2. **Is this a collection page?**
   - Long management lists usually keep the search / filter condition band reachable while scrolling. Use the shared recipe in [examples/list-page.tsx](./examples/list-page.tsx) or an app-level wrapper instead of inventing per-page sticky math.
   - Multi-select / bulk action flow: use `Table` selected state + a bulk-action area; do not put bulk actions in every row.
3. **Is this a create / edit page?**
   - Independent fields: single-step form.
   - Sequential dependency, branching, review, or external processing: multi-step wizard.
   - Very small contextual edit: modal form.
   - Batch, external-processing, or long-running flow: dedicated flow page or wizard, not a normal modal.
4. **Is this a record detail page?**
   - Only 1-2 core sections: use a plain overview page; tabs are unnecessary.
   - Multiple peer sections: use same-page tabs.
   - Heavy section, independent URL, permission boundary, or loading boundary: sub-routes are allowed; record the reason.

### 0.2 Density Selection

Default to **standard density**: page bodies use `PageBody`; card interiors use `p-5 / gap-5`. Choose another density only when the task shape changes:

- **compact density**: high-frequency operation tables, logs, matrices, or dense settings. Use existing spacing tokens only; do not hand-write arbitrary values.
- **focused density**: single-task forms, confirmations, or pages that need fewer distractions. Still use existing page padding / Card / Modal scales.

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
| `--radius-xl` = 12px | `rounded-xl` | Cards, modals, drawers, table containers |
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
    {/* ① condition band: toolbar + applied filters; sticky by default on list pages — see §4 */}
    {/* ② list card: count band + Table + pagination */}
  </PageBody>
</>
```

### 1.2 Create Page

Two main shapes: ordinary "new / edit" pages use the **single-step form**; use a **multi-step wizard** only when the task genuinely benefits from step-by-step progression. Very small contextual edits can use modal forms; long-running or multi-stage flows should use a dedicated page or wizard.

**Single-step form (default)** — Cancel and Submit live in the header; the body is one centered column of section cards. See [examples/create-form.tsx](./examples/create-form.tsx) for the concrete style recipe.

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

**Multi-step wizard** — when the task benefits from step-by-step progression. See [examples/create-wizard.tsx](./examples/create-wizard.tsx) for the concrete step, footer, summary-rail, and done-state recipe.

```tsx
<>
  <PageHeader title description actions={<Button variant="ghost" iconLeft={<X/>}>Cancel</Button>} />
  <PageBody>
    <StepIndicator className="rounded-xl border border-line-default bg-surface-2 px-5.5 py-4 shadow-1" … />
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">{/* current step group + footer nav */}</div>
      {/* optional summary rail, only when it helps the task */}
    </div>
  </PageBody>
</>
```

### 1.3 Detail Page

If the detail page has multiple peer sections, use same-page tabs. One or two core sections can render directly; if a section is heavy, needs an independent URL, permission boundary, or independent loading boundary, sub-routes are allowed with a recorded reason per §0.3.

```tsx
<Tabs value={tab} onValueChange={…} className="gap-0">
  <PageHeaderBand tabs={<TabsList className="shadow-none">…</TabsList>}>
    <DetailHeader … />
  </PageHeaderBand>
  <TabsContent value="…" className={PAGE_BODY_PADDING_CLASS_NAME}>…</TabsContent>
</Tabs>
```

---

## 2. Page Header

### 2.1 Full-Bleed White Band

`PageHeaderBand`: `bg-surface-2` + `border-b border-line-subtle`, inner `px-6 py-4`; sits flush under the topbar, spanning edge to edge. The `tabs` slot renders on the band's bottom edge (`flex px-6`) — pass a line-variant `TabsList` (the default) with `shadow-none` so the tab underline merges with the band border. The header-band tab strip stands **~42px** tall; this height expectation applies to tabs attached to `PageHeaderBand`, not every standalone `Tabs` instance. The height is padding-driven by the line variant, not a fixed `h-*`; if a page needs it exact, size the consumer — don't retune the shared `Tabs` primitive.

> **Source & selection rule.** Both `PageHeader` (list / create header, §2.2) and `PageHeaderBand` (detail header, §2.3) live in `@cloud/ui/components/layout`. Portal management pages (list / create / detail) default to these full-bleed bands — flush under the topbar, `text-2xl`. Plain in-content title pages (dashboard, settings) use `ContentHeader` from the same package instead; it is an in-flow `text-3xl` title, not a band.

### 2.2 List / Create Header (`PageHeader`)

- Row container: `flex flex-wrap items-center gap-x-4 gap-y-3`; actions align to the vertical center of the left title/description block
- Title: `h1` `text-2xl font-semibold tracking-tight text-content-primary`; inline status chip sits at `gap-2.5`
- Description: `mt-1.5 max-w-3xl text-sm text-content-tertiary`
- Actions: right-aligned `flex shrink-0 items-center gap-2`. By page type:
  - **List** — default one `variant="primary"` main action ("New …"). Secondary actions use `secondary` / `ghost` / overflow menu by priority; do not promote everything to primary.
  - **Wizard** — one `variant="ghost"` escape action ("Cancel")
  - **Single-step form** — `ghost` Cancel and `primary` Submit together, with the band set `sticky` so Submit stays reachable while the form scrolls (§6.1)

### 2.3 Detail Header

Inside the band, no card. Layout: `flex flex-wrap items-center gap-4`, left to right.

If the detail header needs a back affordance, place it at the far left and keep it visually consistent:

```tsx
<Button
  variant="ghost"
  size="icon-sm"
  aria-label="Back"
>
  <ChevronLeft className="size-4" />
</Button>
```

- Ghost icon button (`icon-sm`) + `ChevronLeft size-4`, no text.
- The navigation target and behavior come from the product navigation layer (breadcrumb, known parent route, or explicit return target). Do not hard-code a module-list `href` in this spec.
- `aria-label` is required for icon-only buttons.

| Element | Spec |
|---|---|
| Back | optional; if present, use the recipe above |
| Identity | logo / avatar / initial tile at `lg` size; omit if the record has none |
| Title row | `h1 text-2xl font-semibold tracking-tight` + status Badge, `gap-2.5` |
| Meta row | `mt-2 flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-content-secondary`; items use icon `size-3.5` + `gap-1` |
| Action | `Button variant="secondary"` + `shrink-0`; a single button gets no wrapper div |

Tab count chip: `ml-1 h-4 min-w-4 rounded-full bg-surface-3 px-1 text-xs font-medium text-content-tertiary`; omit when the count is 0.

---

## 3. Page Body & Spacing System

Spacing follows the `--space-*` variables in `packages/ui/src/components/styles/index.css`: `--space-1` 4px, `--space-2` 8px, `--space-3` 12px, `--space-4` 16px, `--space-5` 20px, `--space-6` 24px, plus `--space-8/10/12` for large empty states and focused moments. In page code, use `@cloud/ui` layout primitives and scale utilities (`px-6`, `gap-5`, `py-3`) instead of arbitrary values.

**Standard density** — page-body density is centralized in `PageBody`. Vertical rhythm runs **24 → 16 → 20**: large blocks 24px; standard sticky-list recipe tightens the condition band → list card gap to **16px**; card interior is **20px** (`p-5` padding, `gap-5` stacks). This is the default portal-management density; except for compact / focused cases in §0.2, adapt content, not spacing.

Do not tune padding / gaps on one page just to squeeze or stretch content. If the page has too much content, split it into sections, tabs, pagination, or a dedicated flow instead of breaking the density scale.

| Level | Value | Notes |
|---|---|---|
| Page body | `PageBody` / `PAGE_BODY_PADDING_CLASS_NAME` | Component-owned `px-6 pt-6 pb-8` and block gap; do not hand-write page-body padding / gap in pages |
| Page gutters / column gap | `px-6` / `gap-6` (`--space-6`, 24px) | Default horizontal rhythm and large page blocks |
| Page-level block gap | built into `PageBody` (`gap-6`) | List blocks; wizard blocks; detail two-column gap |
| Search band ↔ list card | **16px** (`--space-4`) when using the standard sticky-list recipe | Long lists keep conditions close to results; short or embedded lists can keep normal `gap-6` (§4, §5) |
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

**A row that carries a name/title at its head and an action at its tail is vertically center-aligned** (`items-center`) — the leading label and trailing action sit on the same center axis, never `items-start`. This applies wherever the shape occurs: section-card row lists (§7.2), settings/list rows with a trailing button or switch, the detail header (§2.3), and in-card head bands with `CardAction`.

Only exception: when the row head is genuinely multi-line (title + subline + meta) and the action must align to the first line, top-align the row (`items-start`). Center is the default.

### 3.2 Row-Inline Action Hover

When a row has its own hover (`hover:bg-surface-hover`) **and** carries inline action icons, each icon needs a hover state **distinct from the row's**. A default `ghost` button also hovers to `bg-surface-hover`, so on an already-hovered row its own hover is invisible. Surface tokens are solid, so the nested control must switch token:

- **Neutral action** (edit, more, …): `ghost` bumped one step — `className="hover:bg-surface-active"`.
- **Destructive action** (delete): `variant="ghost-danger"` — its hover is an `error-bg` tint and signals intent.
- Always `e.stopPropagation()` on the action's `onClick` so it doesn't fire the row's `onRowClick`; group icons in a `flex items-center` cluster. Destructive actions still confirm via a modal (§7.3).

Example: a hoverable row with edit / delete actions in the trailing column.

### 3.3 Icon-Button Actions & Destructive Intent

Two invariants apply everywhere an action appears:

- **An icon-only action button is `ghost` (neutral) or `ghost-danger` (destructive) — never `secondary` / `primary` / bordered.** A bare icon has no label, so emphasis must come from a hover token, not a filled background. A labeled row action may still use `secondary` / `primary` when it deserves weight.
- **Every destructive action carries a danger variant.** Delete / remove / revoke / terminate / reset / disconnect: icon-button form uses `variant="ghost-danger"`; text button or modal-footer form uses `variant="danger"`. Do not signal danger by tinting a neutral `ghost` or overriding the icon color inside `ghost-danger`; the variant owns the color.

### 3.4 Clickable Surface States

Any clickable surface — list row, quick-filter tile, pick-one card — earns affordance from a **background** shift, not a border alone. Border / ring may reinforce, but cannot be the only signal. Neutral surface scale steps one solid shade at a time: `surface-2` → `surface-hover` → `surface-active`.

- **Navigational** (row / card opens a detail or fires `onRowClick`, then leaves the page): rest = own bg → `hover:bg-surface-hover` → `active:bg-surface-active`. No persistent lit state.
- **Selectable / toggle** (stays lit after click — pick-one card, quick-filter card, multi-select row): selected is primary-tinted and beats hover. Gate neutral hover behind `!selected`.
  - **Row inside a `Table`**: pass `state.selected`; the primitive applies selected styling. Do not hand-roll it.
  - **Free-standing tile / card**: use `border-primary-500 bg-primary-50`; selectable metric or filter cards may add `ring-2 ring-primary-500/10`.
- **Nested actions** on a hoverable row keep row-distinct hover (§3.2).

Hard rule: **selected ≠ hover.** A selected surface must not carry unconditional `hover:bg-surface-hover`.

---

## 4. Toolbar & Applied Filters

When a list uses an explicit Search button, pressing Enter in a search field must trigger the same search. Lists with cheap local filtering may update immediately; expensive remote queries should avoid firing on every keystroke.

Long management lists should keep the condition band (toolbar + filter feedback) reachable while scrolling. Keep the implementation centralized: use [examples/list-page.tsx](./examples/list-page.tsx) as the style recipe or wrap it in an app-level list-toolbar component. Do not hand-tune sticky offsets, negative margins, or z-index values page by page.

Short lists, embedded lists, and pages where filters are secondary may keep the condition band in normal flow.

- Row container: `flex flex-wrap items-center gap-2`; every control at `md` (36px tall).
- Search input: `inputSize="md"` + `prefix={<Search className="size-4"/>}`, wrapped in `max-w-64 flex-1`.
- Select filters: `SelectTrigger size="md"` at fixed scale widths near the needed range (`w-40` / `w-44` / `w-48`, roughly 150–200px); use the `SelectValue` render prop to show labels. Never write `w-[150px]`, `w-[180px]`, or another page-local arbitrary width just to mirror a prototype.
- Submit: `variant="primary" size="md"` with the Search icon.

**Filter feedback row**:

- No filters: one-line hint in `text-xs text-content-tertiary`.
- With filters: localized active-filter label + FilterChips + clear-all action (`ghost xs`).
- FilterChip: `rounded-full border border-primary-500/25 bg-primary-50 py-0.5 pr-1 pl-2.5 text-xs font-medium text-primary-700`, trailing `Button size="icon-xs" variant="ghost"` X for individual removal.

---

## 5. List Card

Structure: `Card elevation={1}` → count band → `Table` → `RichPagination`. The three segments separate themselves with borders; the card adds no padding of its own. When paired with the standard sticky condition band, follow the spacing recipe in [examples/list-page.tsx](./examples/list-page.tsx); non-sticky lists keep normal `gap-6`.

### 5.1 Count Band

`flex items-center justify-between gap-3 border-b border-line-subtle px-4 py-3`. Left: `text-sm text-content-secondary`, number in `font-mono font-semibold tabular-nums text-content-primary`, appending ` matching filters` (tertiary) when filtered. Right: action slot (export button, `secondary sm`).

### 5.2 Table

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
| Tag set / multiple badges | Always horizontal: `flex flex-wrap gap-1`; render chips with `Badge shape="tag"`; empty = `—`. Do not stack multiple badges vertically inside one table cell. |
| Trailing chevron | `width: 48, align: "right"`, passive `ChevronRight size-3.5 text-content-tertiary`; the whole row is the click target (`onRowClick`). If the row needs inline actions, drop the chevron and follow §3.2. |
| Actions | icon buttons use only `ghost` / `ghost-danger`; important row actions must be labeled, then may use `secondary` / `primary` |

- Pass column titles as uppercase text; the primitive applies no text-transform.
- Sorting is tri-state: asc → desc → natural order; handle `onSortChange(null)`.
- Empty state: `py-12 text-center text-sm text-content-tertiary`, with distinct copy for "no data" vs "no matches".

### 5.3 Pagination Band (`RichPagination`)

Use `RichPagination` from `@cloud/ui`; do not recompose its footer from `Select` + `Pagination` in page code. The component owns the footer layout:

- Shell: `flex flex-wrap items-center justify-between gap-3 border-t border-line-subtle px-4 py-3`
- Left: localized rows-per-page selector (when `onPageSizeChange` is provided) + localized `Showing X-Y of Z` summary (`text-xs`, digits `tabular-nums`)
- Right: `Pagination` page buttons (no go-to-page input)
- Page-size options default to `[10, 25, 50, 100]`; pass `pageSizeOptions` only when the list needs a different set
- Reset page to 1 in the page-size-change handler
- Consumers must provide the `ui.pagination.*` i18n messages used by `@cloud/ui`

---

## 6. Create Page

Two main shapes: **single-step form** (§6.1 — default for ordinary new/edit pages) and **multi-step wizard** (§6.2 — when the task benefits from step-by-step progression). Very small contextual edits can use modal forms; multi-stage or long-running flows should use a dedicated page or wizard.

### 6.1 Single-Step Form

Single-step forms are the default for independent fields. Use `PageHeader` for the title and actions, then place section cards in a centered column inside `PageBody`. See [examples/create-form.tsx](./examples/create-form.tsx) for the sticky-header and card-stack style recipe.

Do not add footers, rails, or confirmation steps simply because the example exists. Add them only when the page task needs that affordance.

### 6.2 Multi-Step Wizard

Use a wizard only when the user must move through meaningful stages: dependency, branching, review, external processing, or cross-step summary. Do not switch to a wizard merely because there are many fields; many independent fields still belong in a sectioned single-step form.

The concrete step indicator, footer navigation, optional summary rail, error banner, and done-state styling live in [examples/create-wizard.tsx](./examples/create-wizard.tsx). Treat that file as a copyable style skeleton, not a product requirement.

---

## 7. Detail Page

Read-only detail pages default to `PageHeaderBand` + content. Use tabs based on content: 1-2 core sections can render directly in overview; multiple peer sections use tabs; heavy sections, independent permissions, or deep-link needs may use sub-routes with a recorded reason. If the product explicitly treats edit as the detail surface, choose the create/edit form pattern that fits the task and do not add tabs or a read-only detail header just to satisfy this section.

### 7.1 Overview Two-Column

`flex flex-col gap-6 lg:flex-row lg:items-start`; main card `Card className="min-w-0 flex-1"`; right rail `flex w-full flex-col gap-6 lg:w-80 lg:shrink-0` (320px).

- **KV grid**: `dl grid-auto-fit-kv gap-x-8 gap-y-3.5 text-sm`; columns adapt to the card's own width. Row `flex gap-5`, `dt w-40 shrink-0 font-medium text-content-tertiary`, `dd min-w-0 flex-1`; long free-text rows get `col-span-full`; missing values render `Not provided` (tertiary).
  - Responsive auto-fit columns always go through `grid-auto-fit-*` utilities; never hand-write `grid-cols-[repeat(auto-fit,minmax(…))]`.
- **Reveal controls**: if a product flow already requires masked values, the per-field Reveal control uses `text-xs font-medium text-info-strong hover:underline`. Masking and reveal policy belong to the business / security layer, not this style spec.

### 7.2 Section Cards

- Head: `CardHeader` + `CardTitle className="text-md"` (+ `CardDescription className="text-xs leading-relaxed text-content-tertiary"`); header buttons go in `CardAction`, not hand-rolled flex containers.
- Row-list content: `CardContent flush` with rows as direct children: `flex items-center gap-3~3.5 px-4~4.5 py-3~3.5 border-b border-line-subtle last:border-b-0`; leading `size-10 rounded-lg` category tile, title `text-sm font-semibold` + chips at `gap-2`, subline `text-xs`.
- Clickable rows: `role="button"` + `cursor-pointer hover:bg-surface-hover` (+ `active:bg-surface-active`). Persistent selected rows use primary tint and suppress hover while selected. Inline action clusters call `stopPropagation` and use row-distinct hover (§3.2).
- In-section empty state: `px-4~6 py-8~12 text-center text-sm text-content-tertiary`.

### 7.3 Modals

Small contextual mutations default to modals; long forms, batch work, external-processing tasks, or flows that need full-page context do not belong in modals. Width always uses the `Modal` `size` prop (`sm` / `md` / `lg` / `xl`), never page-local max-width classes. Footer is always `ghost` Cancel + the primary action; destructive actions use `variant="danger"` + `loading`.

---

## 8. Typography & Data Display

Portal typography follows the `@cloud/ui` type scale. Use only **Geist** for headings/body and **Geist Mono** for data-like text; do not introduce page-local fonts. Default weights are `400 / 500 / 600`; `700` is reserved for rare emphasis. Avoid `300 / 800 / 900`.

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

## 9. Cheat Sheet

```
rule levels           MUST baseline / SHOULD default / MAY conditional / AVOID with reason
color tokens          use semantic utilities from packages/ui styles; no raw hex/OKLCH
radius scale          4/6/8/12/16/full       no in-between one-off radii
spacing scale         --space-1..6 = 4..24   --space-8/10/12 for empty/focused states
page body             PageBody              TabsContent uses PAGE_BODY_PADDING_CLASS_NAME
sticky search→card    use list-page recipe   rare non-sticky lists keep gap-6
card interior         p-5 / gap-5 (20)      card stacks gap-5 (tight 3.5)
in-card bands         px-4 py-3             wizard card head px-5 py-3.5 (14·20)
detail tabs           peer sections use tabs; heavy sections may use sub-routes with reason
condition controls    always size md        search input max-w-64 flex-1
sticky condition band use shared recipe/example; do not tune offsets per page
single-step form      header actions + centered section-card column
wizard                only for meaningful stages; concrete chrome lives in example
modal size prop       sm360 md480 lg640 xl880; small mutations modal, complex flows page/wizard
empty state           py-12 centered text-sm tertiary
clickable surface     hover:bg-surface-hover  press active:bg-surface-active (§3.4)
selectable surface    selected=primary-tinted, beats hover → gate hover on !selected
```
