"use client"

import * as React from "react"
import { cn } from "../../lib/utils"

// Single KPI / stat tile (style-spec §4). Presentational leaf — the grid, the
// data array, and any filter linkage live in the consuming page (a tile is
// commonly a one-tap quick-filter synced to the list toolbar's applied state,
// but that wiring stays in the parent).
//
// Pass `onClick` to make it interactive: it renders as a keyboard-accessible
// role="button" (NOT a native <button>, per the apps lint rule) with hover.
// Omit `onClick` for a pure stat display. Active styling intentionally beats
// hover. Supply the standard label/value/sub, or pass `children` for a custom
// inner layout.

interface KpiTileProps {
  label?: React.ReactNode
  value?: React.ReactNode
  sub?: React.ReactNode
  active?: boolean
  /** Provide to make the tile an interactive filter; omit for pure display. */
  onClick?: () => void
  /** Custom inner content; overrides label/value/sub. */
  children?: React.ReactNode
  className?: string
}

function KpiTile({
  label,
  value,
  sub,
  active = false,
  onClick,
  children,
  className,
}: KpiTileProps) {
  const interactive = Boolean(onClick)
  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? active : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      className={cn(
        "rounded-lg border px-4 py-3 text-left transition-colors",
        interactive && "cursor-pointer",
        active
          ? "border-primary-500 bg-primary-50 ring-2 ring-primary-500/10"
          : "border-line-subtle bg-surface-2 shadow-1",
        interactive && !active && "hover:bg-surface-hover",
        className,
      )}
    >
      {children ?? (
        <>
          <div
            className={cn(
              "text-2xs font-medium tracking-wider uppercase",
              active ? "text-primary-700" : "text-content-tertiary",
            )}
          >
            {label}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className={cn(
                "font-mono text-2xl tracking-tight tabular-nums",
                active ? "font-semibold text-primary-700" : "font-medium text-content-primary",
              )}
            >
              {value}
            </span>
            {sub ? <span className="text-2xs text-content-tertiary">{sub}</span> : null}
          </div>
        </>
      )}
    </div>
  )
}

export { KpiTile, type KpiTileProps }
