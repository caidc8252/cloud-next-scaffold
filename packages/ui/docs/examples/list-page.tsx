"use client";

// ─────────────────────────────────────────────────────────────────────────────
// STYLE TEMPLATE · List page (spec §1.1 §2.2 §3–§5)
//
// Compilable style skeleton for the portal LIST page shape. The condition band,
// chips, summary bar, and draft/applied state come from the @cloud/ui list-filter
// family (ListConditionBand / SearchInput / AppliedFilters / FilterChip /
// ListSummaryBar) + useListFilters (spec §4) — pages no longer hand-roll them.
//
// Sticky model: the condition band scrolls away (sticky={false}); what stays
// docked at the scroll-root top is the result-count/Export summary bar plus the
// table's column header (Table stickyHeader, offset by LIST_SUMMARY_BAR_HEIGHT).
// The list Card runs overflow-visible so it doesn't trap those sticky elements.
// Reference implementation: apps/admin/.../sales/catalog/_components/catalog-list.tsx
//
// Style-only: data is hardcoded, <a> stands in for next/link. In a real page:
// requirePermissions() in page.tsx, @cloud/request/client for data, router.push to
// open rows, and @cloud/ui's PageHeader (@cloud/ui/components/layout) for the band.
// NOT exported from @cloud/ui — never enters the bundle.
// ─────────────────────────────────────────────────────────────────────────────

import { ChevronRight, Download, Plus, Search } from "lucide-react";
import {
  AppliedFilters,
  Badge,
  Button,
  Card,
  Empty,
  FilterChip,
  LIST_SUMMARY_BAR_HEIGHT,
  ListConditionBand,
  ListSummaryBar,
  PageBody,
  RichPagination,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  useListFilters,
  type TableColumn,
} from "@cloud/ui";

type Row = {
  id: string;
  name: string;
  city: string;
  status: "Active" | "Onboarding";
  registeredAt: string; // pre-formatted; real pages use useFormatter()
  tags: string[];
};

const ROWS: Row[] = [
  { id: "1", name: "Northwind Trading Co.", city: "Springfield, OR", status: "Active", registeredAt: "Mar 12, 2024", tags: ["ISV"] },
  { id: "2", name: "Globex Payments LLC", city: "San Francisco, CA", status: "Active", registeredAt: "Nov 5, 2023", tags: ["ISO", "Merchant"] },
  { id: "3", name: "Initech Systems", city: "Austin, TX", status: "Onboarding", registeredAt: "May 20, 2026", tags: [] },
];

// §5.2 — text columns come in exactly three shapes (two-line / numeric mono / plain).
const COLUMNS: TableColumn<Row>[] = [
  {
    key: "name",
    title: "CUSTOMER", // titles are passed as uppercase text — the primitive adds no text-transform
    sortable: true,
    render: (r) => (
      // Shape 1 · two-line text column: primary text-sm medium + subline text-2xs tertiary
      <div className="flex items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-3 text-xs font-semibold text-content-secondary">
          {r.name[0]}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-content-primary">{r.name}</div>
          <div className="truncate text-2xs text-content-tertiary">{r.city}</div>
        </div>
      </div>
    ),
  },
  {
    key: "status",
    title: "STATUS",
    render: (r) => (
      <Badge tone={r.status === "Active" ? "success" : "info"} dot>
        {r.status}
      </Badge>
    ),
  },
  {
    key: "registeredAt",
    title: "REGISTERED",
    sortable: true,
    // Shape 2 · single-line numeric / data value: always mono + tabular-nums
    render: (r) => <span className="font-mono text-2xs tabular-nums text-content-secondary">{r.registeredAt}</span>,
  },
  {
    key: "city",
    title: "CITY",
    // Shape 3 · single-line plain text: table default size + secondary, NO mono
    render: (r) => <span className="text-content-secondary">{r.city}</span>,
  },
  {
    key: "tags",
    title: "TAGS",
    render: (r) =>
      r.tags.length === 0 ? (
        <span className="text-content-tertiary">—</span>
      ) : (
        <div className="flex flex-wrap gap-1">
          {r.tags.map((t) => (
            <Badge key={t} tone="info">
              {t}
            </Badge>
          ))}
        </div>
      ),
  },
  {
    key: "actions",
    title: "",
    width: 48,
    align: "right",
    // Passive chevron — the whole row is the click target (onRowClick), no inline buttons.
    render: () => <ChevronRight className="inline-block size-3.5 text-content-tertiary" />,
  },
];

export function ListPageTemplate() {
  // §4 — draft/applied state machine. apply() commits the draft; a real page resets page 1 in onApply.
  const filters = useListFilters({ initial: { q: "", contract: "All" }, onApply: () => {} });

  return (
    <>
      {/* §2.2 — full-bleed white header band. In apps/admin use <PageHeader/> from @cloud/ui/components/layout. */}
      <div className="border-b border-line-subtle bg-surface-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-6 py-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-content-primary">Customers</h1>
            <p className="mt-1.5 max-w-3xl text-sm text-content-tertiary">
              Maintain customer companies, their contracts and operators.
            </p>
          </div>
          <Button variant="primary" iconLeft={<Plus className="size-4" />} onClick={() => {}}>
            New customer
          </Button>
        </div>
      </div>

      <PageBody>
        {/* §4 — condition band: quick-bar slot + applied-chip slot. Non-sticky by
            default now — the band scrolls away; the list card's summary bar + table
            header are what stays docked at the top (see ListSummaryBar + Table below). */}
        <ListConditionBand
          toolbar={
            <>
              <SearchInput
                value={filters.draft.q}
                onChange={(v) => filters.setDraft("q", v)}
                onSearch={filters.apply}
                placeholder="Search by name, address, license"
              />
              <Select value={filters.draft.contract} onValueChange={(v) => filters.setDraft("contract", String(v ?? "All"))}>
                <SelectTrigger size="default" className="w-40">
                  <SelectValue>{(v) => `Contract: ${String(v)}`}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All contracts</SelectItem>
                  <SelectItem value="ISO">ISO</SelectItem>
                </SelectContent>
              </Select>
              {/* Secondary — the screen's single primary CTA is "New customer" (§3.2). */}
              <Button variant="secondary" size="md" iconLeft={<Search className="size-4" />} onClick={filters.apply}>
                Search
              </Button>
            </>
          }
          applied={
            <AppliedFilters onClearAll={filters.clearAll}>
              {filters.applied.contract !== "All" ? (
                <FilterChip label={`Contract: ${filters.applied.contract}`} onRemove={() => filters.clearField("contract")} />
              ) : null}
            </AppliedFilters>
          }
        />

        {/* §5 — list card: summary bar + Table + pagination band (card adds no padding).
            overflow-clip is REQUIRED here: it still rounds the corners but, unlike the
            card's default overflow-hidden, does NOT establish a scroll container — so the
            sticky summary bar / table header dock to the page instead of being trapped. */}
        <Card elevation={1} className="overflow-clip">
          {/* Sticky summary bar — pins to the scroll-root top together with the table header. */}
          <ListSummaryBar
            total={ROWS.length}
            label={
              <>
                customers
                {filters.hasApplied && <span className="text-content-tertiary"> matching filters</span>}
              </>
            }
            actions={
              <Button variant="secondary" size="sm" iconLeft={<Download className="size-3.5" />} onClick={() => {}}>
                Export
              </Button>
            }
          />

          {/* stickyHeader docks the column header to the page scroll root; stickyHeaderTop
              offsets it by the summary bar's height so the two tile flush. */}
          <Table
            columns={COLUMNS}
            rows={ROWS}
            rowKey={(r) => r.id}
            onRowClick={() => {}}
            stickyHeader
            stickyHeaderTop={LIST_SUMMARY_BAR_HEIGHT}
            empty={<Empty title="No customers match your search." />}
          />

          {/* §5.3 — RichPagination owns rows-per-page, range summary, and page buttons */}
          <RichPagination page={1} pageCount={1} onPageChange={() => {}} total={ROWS.length} pageSize={25} onPageSizeChange={() => {}} />
        </Card>
      </PageBody>
    </>
  );
}
