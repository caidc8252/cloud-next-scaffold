"use client"

import type { ReactNode } from "react"
import { cn } from "../../lib/utils"

// Fixed bar height in px. The table's stickyHeaderTop MUST match this so the
// column header docks flush beneath the bar when both are pinned. Exported so
// list pages wire the offset without a magic number. Keep in sync with the
// `h-12` class below.
export const LIST_SUMMARY_BAR_HEIGHT = 48

// Result-count + actions bar between the list card's top edge and the table
// (portal-page-style-spec §5): mono result count + label on the left, an
// actions slot (Export, bulk ops) on the right. Left as nodes — count label
// and "matching filters" copy carry i18n on the page side, mirroring how
// ListConditionBand takes toolbar/applied nodes.
//
// sticky (default true): docks at top-0 of the scroll root so it stays pinned
// together with the table's sticky column header while the body scrolls. Two
// requirements on the host or the sticky is trapped and silently scrolls away:
//   1. the surrounding Card must use `overflow-clip` instead of its default
//      overflow-hidden — clip still rounds the corners but does NOT establish a
//      scroll container, so the sticky bar can dock to the page scroll root.
//   2. the Table must run stickyHeader with stickyHeaderTop={LIST_SUMMARY_BAR_HEIGHT}.
// Pass sticky={false} for short / embedded lists that keep the bar in flow.
export function ListSummaryBar({
  total,
  label,
  actions,
  sticky = true,
}: {
  total: ReactNode
  label?: ReactNode
  actions?: ReactNode
  sticky?: boolean
}) {
  return (
    <div
      className={cn(
        "flex h-12 items-center justify-between gap-3 border-b border-line-subtle bg-surface-2 px-4",
        sticky && "sticky top-0 z-10",
      )}
    >
      <div className="flex items-baseline gap-1 text-md text-content-secondary">
        <span className="font-mono font-semibold text-content-primary tabular-nums">{total}</span>
        {label ? <span>{label}</span> : null}
      </div>
      {actions}
    </div>
  )
}
