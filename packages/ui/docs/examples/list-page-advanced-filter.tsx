"use client";

// ─────────────────────────────────────────────────────────────────────────────
// STYLE TEMPLATE · List page with an Advanced Filter Sheet (spec §4 + §4.1)
//
// Composes the @cloud/ui list-filter family — ListConditionBand / SearchInput /
// AppliedFilters / FilterChip / AdvancedFilterButton / AdvancedFilterSheet
// (+ Group / Field) — driven by useListFilters. The page supplies only the fields
// and predicates; the family owns the band, the sheet shell, the three-state
// trigger, deferred apply, and the chip row.
//
// The sheet FIELDS ARE PLACEHOLDERS — real fields are product-defined. Reference
// implementation: apps/admin/.../apps/app-publish/_components/app-publish-list.tsx
// NOT exported from @cloud/ui — never enters the bundle.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Search } from "lucide-react";
import {
  AdvancedFilterField,
  AdvancedFilterGroup,
  AdvancedFilterButton,
  AdvancedFilterSheet,
  AppliedFilters,
  Button,
  Card,
  FilterChip,
  Input,
  ListConditionBand,
  PageBody,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Toggle,
  ToggleGroup,
  useListFilters,
} from "@cloud/ui";

// Placeholder advanced conditions — names are intentionally generic (the spec does
// not prescribe fields). All are single-value so countActive() can drive the badge;
// array fields (multi-select) would need their own count in the page.
type Filters = { q: string; category: string; reference: string; window: string | null };
const INITIAL: Filters = { q: "", category: "all", reference: "", window: null };
const ADVANCED_KEYS = ["category", "reference", "window"] as const;

export function ListPageAdvancedFilterTemplate() {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const filters = useListFilters<Filters>({ initial: INITIAL, onApply: () => {} });
  const { q, category, reference, window: win } = filters.applied;

  // Badge counts applied sheet conditions; Reset is disabled when the draft has none.
  const advCount = filters.countActive(ADVANCED_KEYS);
  const advDraftClean = filters.countActive(ADVANCED_KEYS, "draft") === 0;

  const applyAndClose = () => {
    filters.apply();
    setAdvancedOpen(false);
  };

  return (
    <>
      {/* §2.2 — full-bleed header band. In apps/admin use <PageHeader/> from @cloud/ui/components/layout. */}
      <div className="border-b border-line-subtle bg-surface-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-6 py-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-content-primary">Resources</h1>
            <p className="mt-1.5 max-w-3xl text-sm text-content-tertiary">
              A list whose extra conditions live in a right-side Advanced Sheet (spec §4.1).
            </p>
          </div>
        </div>
      </div>

      <PageBody>
        {/* §4 — quick bar (search + Advanced trigger) + applied-chip row, all via the family */}
        <ListConditionBand
          toolbar={
            <>
              <SearchInput
                value={filters.draft.q}
                onChange={(v) => filters.setDraft("q", v)}
                onSearch={filters.apply}
                placeholder="Search by name or id"
              />
              {/* Secondary — the screen's single primary CTA is the page-header "New …" action (§3.2). */}
              <Button variant="secondary" size="md" iconLeft={<Search className="size-4" />} onClick={filters.apply}>
                Search
              </Button>
              <AdvancedFilterButton open={advancedOpen} onToggle={() => setAdvancedOpen((v) => !v)} count={advCount} />
            </>
          }
          applied={
            <AppliedFilters onClearAll={filters.clearAll}>
              {q ? <FilterChip label={`Search: ${q}`} onRemove={() => filters.clearField("q")} /> : null}
              {category !== "all" ? <FilterChip label={`Category: ${category}`} onRemove={() => filters.clearField("category")} /> : null}
              {reference ? <FilterChip label={`Ref: ${reference}`} onRemove={() => filters.clearField("reference")} /> : null}
              {win ? <FilterChip label={`Window: ${win}`} onRemove={() => filters.clearField("window")} /> : null}
            </AppliedFilters>
          }
        />

        {/* List card context — the count band + Table + pagination live in examples/list-page.tsx */}
        <Card elevation={1} className="-mt-2">
          <div className="px-4 py-3 text-sm text-content-secondary">
            List rows render here — see <code className="font-mono text-xs">examples/list-page.tsx</code> for the count band,
            Table, and pagination.
          </div>
        </Card>
      </PageBody>

      {/* §4.1 — Advanced Filter Sheet. Editing stages a draft; Apply & Search commits + closes; closing keeps the draft. */}
      <AdvancedFilterSheet
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        onApply={applyAndClose}
        onReset={() => filters.reset(ADVANCED_KEYS)}
        resetDisabled={advDraftClean}
      >
        <AdvancedFilterGroup label="Group A">
          <AdvancedFilterField label="Field A · select">
            <Select value={filters.draft.category} onValueChange={(v) => filters.setDraft("category", String(v ?? "all"))}>
              <SelectTrigger className="w-full">
                <SelectValue>{(v) => (v === "all" ? "Any" : String(v))}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                <SelectItem value="one">Option one</SelectItem>
                <SelectItem value="two">Option two</SelectItem>
              </SelectContent>
            </Select>
          </AdvancedFilterField>
          <AdvancedFilterField label="Field B · text">
            <Input
              inputSize="md"
              placeholder="Type a value"
              value={filters.draft.reference}
              onChange={(e) => filters.setDraft("reference", e.target.value)}
            />
          </AdvancedFilterField>
        </AdvancedFilterGroup>

        <AdvancedFilterGroup label="Group B">
          {/* Single-select → segmented control; selected state per §3.4 is owned by the variant */}
          <AdvancedFilterField label="Window · segmented" className="sm:col-span-2">
            <ToggleGroup
              type="single"
              variant="segmented"
              value={filters.draft.window}
              onValueChange={(v) => filters.setDraft("window", v)}
            >
              <Toggle value="24h">24h</Toggle>
              <Toggle value="7d">7d</Toggle>
              <Toggle value="30d">30d</Toggle>
            </ToggleGroup>
          </AdvancedFilterField>
        </AdvancedFilterGroup>
      </AdvancedFilterSheet>
    </>
  );
}
