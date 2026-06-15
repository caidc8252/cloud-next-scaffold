"use client"

import type { ReactNode } from "react"

// Condition band shell (portal-page-style-spec §4). Fills two slots: toolbar
// (quick-bar controls) + applied (the chip row, may be null).
// sticky (default false) keeps the band in normal flow: the standard list page
// docks the result-count/Export bar + table header instead (see ListSummaryBar
// + Table stickyHeader), so the filter band scrolls away. Pass sticky={true} to
// dock the band under the app header with the full-bleed / negative-margin math.
export function ListConditionBand({
  toolbar,
  applied,
  sticky = false,
}: {
  toolbar: ReactNode
  applied?: ReactNode
  sticky?: boolean
}) {
  return (
    <div
      className={
        sticky
          ? "sticky top-0 z-10 -mx-6 -my-3 flex flex-col gap-2.5 bg-surface-1 px-6 py-3"
          : "flex flex-col gap-2.5"
      }
    >
      <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
      {applied}
    </div>
  )
}
