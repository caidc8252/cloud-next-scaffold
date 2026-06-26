import * as React from "react"
import { cn } from "../../../lib/utils"

// Read-only Key-Value field system for detail / overview pages (DS 2.0 §detail
// fields). Vertical KV: the label sits ABOVE the value. Columns are
// CONTAINER-responsive (方案B / AUTO-FIT) — KvGrid reuses the `grid-auto-fit-kv`
// utility (repeat(auto-fit, minmax(min(22rem,100%), 1fr))), so the column count
// follows the container's own width with no breakpoints. This is display-only;
// the data fetch and any edit affordances live in the consuming page.

interface KvGridProps {
  className?: string
  children?: React.ReactNode
}

interface KeyValueProps {
  label: React.ReactNode
  /** The value; empty (undefined / null / "") renders an em dash placeholder. */
  value?: React.ReactNode
  /** Render the value in mono + tabular figures — for IDs, dates, amounts. */
  mono?: boolean
  /** Span the whole KvGrid row — for long free-text like Address / Notes. */
  wide?: boolean
  className?: string
}

// Container <dl> for KeyValue cells. Auto-fit columns follow the container's
// width; `gap-4 gap-y-5` gives the row/column rhythm. Long cells opt into
// `wide` (col-span-full) to break the grid for a full-width value.
function KvGrid({ className, children }: KvGridProps) {
  return (
    <dl className={cn("grid-auto-fit-kv gap-4 gap-y-5", className)}>
      {children}
    </dl>
  )
}

// One KV cell: 12px / 500 / tertiary overline label stacked above a body value.
// Empty value collapses to an em dash in tertiary text so the row keeps its
// vertical rhythm.
function KeyValue({ label, value, mono, wide, className }: KeyValueProps) {
  const isEmpty = value == null || value === ""

  return (
    <div className={cn("flex flex-col gap-1", wide && "col-span-full", className)}>
      <dt className="text-xs font-medium uppercase tracking-overline text-content-tertiary">
        {label}
      </dt>
      <dd
        className={cn(
          "text-md",
          isEmpty ? "text-content-tertiary" : "text-content-primary",
          mono && "font-mono tabular-nums",
        )}
      >
        {isEmpty ? "—" : value}
      </dd>
    </div>
  )
}

export { KvGrid, KeyValue, type KvGridProps, type KeyValueProps }
