"use client";

// ─────────────────────────────────────────────────────────────────────────────
// STYLE TEMPLATE · List page (spec §1.1 §2.2 §3–§6)
//
// Compilable style skeleton for the portal LIST page shape. Reference
// implementation: apps/web/app/(portal)/manage/customers/_components/customer-list.tsx
//
// Style-only: data is hardcoded, handlers are no-ops, <a> stands in for
// next/link. In a real page: requirePermissions() in page.tsx, useState for
// draft/applied filters, @cloud/request/client for data, router.push to open
// rows, and @cloud/ui's PageHeader (@cloud/ui/components/layout)
// instead of the inlined band below.
// NOT exported from @cloud/ui — never enters the bundle.
// ─────────────────────────────────────────────────────────────────────────────

import { ChevronRight, Download, Plus, Search, X } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Input,
  KpiTile,
  Pagination,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
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
  {
    id: "1",
    name: "Northwind Trading Co.",
    city: "Springfield, OR",
    status: "Active",
    registeredAt: "Mar 12, 2024",
    tags: ["ISV"],
  },
  {
    id: "2",
    name: "Globex Payments LLC",
    city: "San Francisco, CA",
    status: "Active",
    registeredAt: "Nov 5, 2023",
    tags: ["ISO", "Merchant"],
  },
  {
    id: "3",
    name: "Initech Systems",
    city: "Austin, TX",
    status: "Onboarding",
    registeredAt: "May 20, 2026",
    tags: [],
  },
];

// §6.2 — text columns come in exactly three shapes (two-line / numeric mono / plain).
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
    render: (r) => (
      <span className="font-mono text-2xs tabular-nums text-content-secondary">
        {r.registeredAt}
      </span>
    ),
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

const STAT_TILES = [
  { key: "all", label: "Total customers", value: 54, sub: "all companies", active: true },
  { key: "active", label: "With active contract", value: 38, sub: "70% of total", active: false },
  { key: "onboarding", label: "Onboarding", value: 9, sub: "setup in progress", active: false },
];

export function ListPageTemplate() {
  return (
    <>
      {/* §2.2 — full-bleed white header band. In apps/web use <PageHeader/> from @cloud/ui/components/layout. */}
      <div className="border-b border-line-subtle bg-surface-2">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3 px-6 py-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-content-primary">
              Customers
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm text-content-tertiary">
              Maintain customer companies, their contracts and operators.
            </p>
          </div>
          <Button variant="primary" iconLeft={<Plus className="size-4" />} onClick={() => {}}>
            New customer
          </Button>
        </div>
      </div>

      {/* §3 — page body: px-6 pt-6 pb-8, blocks at gap-6 */}
      <div className="flex flex-col gap-6 px-6 pt-6 pb-8">
        {/* §4 — KPI quick-filter tiles. The grid + data + which key is active
            (derived from the applied filter) live here; KpiTile is the styled,
            keyboard-accessible leaf. Omit onClick for a pure stat tile. */}
        <div className="grid grid-cols-3 gap-3">
          {STAT_TILES.map((t) => (
            <KpiTile
              key={t.key}
              active={t.active}
              onClick={() => {}}
              label={t.label}
              value={t.value}
              sub={t.sub}
            />
          ))}
        </div>

        {/* §5 — sticky condition band: docks flush under the app header on scroll.
            Full-bleed -mx-6 + canvas bg mask; -my-3 cancels py-3 so resting rhythm stays gap-6. */}
        <div className="sticky top-0 z-10 -mx-6 -my-3 flex flex-col gap-2.5 bg-surface-1 px-6 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Input with prefix puts className on the inner input → width lives on a wrapper */}
            <div className="max-w-64 flex-1">
              <Input
                inputSize="sm"
                prefix={<Search className="size-3.5" />}
                placeholder="Search by name, address, license"
              />
            </div>
            <Select value="All" onValueChange={() => {}}>
              <SelectTrigger size="sm" className="w-[150px]">
                <SelectValue>{(v) => `Contract: ${String(v)}`}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All contracts</SelectItem>
                <SelectItem value="ISO">ISO</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Search className="size-3.5" />}
              onClick={() => {}}
            >
              Search
            </Button>
          </div>
          {/* Applied-filter feedback row: primary-tinted chips + Clear all */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-content-tertiary">Active filters:</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-primary-500/25 bg-primary-50 py-0.5 pr-1 pl-2.5 text-xs font-medium text-primary-700">
              Status: Active
              <Button variant="ghost" size="icon-xs" onClick={() => {}} aria-label="Remove filter">
                <X className="size-3" />
              </Button>
            </span>
            <Button variant="ghost" size="xs" onClick={() => {}}>
              Clear all
            </Button>
          </div>
        </div>

        {/* §6 — list card: count band + Table + pagination band (card adds no padding) */}
        <Card elevation={1}>
          <div className="flex items-center justify-between gap-3 border-b border-line-subtle px-4 py-3">
            <div className="text-sm text-content-secondary">
              <span className="font-mono font-semibold text-content-primary tabular-nums">
                {ROWS.length}
              </span>{" "}
              customers
              <span className="text-content-tertiary"> matching filters</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Download className="size-3.5" />}
              onClick={() => {}}
            >
              Export
            </Button>
          </div>

          <Table
            columns={COLUMNS}
            rows={ROWS}
            rowKey={(r) => r.id}
            onRowClick={() => {}}
            empty={
              <div className="py-12 text-center text-sm text-content-tertiary">
                No customers match your search.
              </div>
            }
          />

          {/* §6.3 — pagination band: rows-per-page + summary | page buttons (no go-to input) */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-subtle px-4 py-3">
            <div className="flex items-center gap-3 text-xs text-content-secondary">
              <div className="flex items-center gap-1.5">
                <span>Rows per page</span>
                <Select value="25" onValueChange={() => {}}>
                  <SelectTrigger size="sm" className="w-[72px]">
                    <SelectValue>{(v) => String(v)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="tabular-nums">Showing 1–3 of 3</span>
            </div>
            <Pagination page={1} pageCount={1} onChange={() => {}} />
          </div>
        </Card>
      </div>
    </>
  );
}
