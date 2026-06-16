"use client"

import * as React from "react"
import { cn } from "../../lib/utils"

// Single stat card (style-spec §4). Presentational leaf — the grid, the data
// array, and any filter linkage live in the consuming page. A stat card can be
// pure display or an interactive quick-filter synced to the list toolbar's
// applied state.
//
// Pass `onClick` to make it interactive: it renders as a keyboard-accessible
// role="button" (NOT a native <button>, per the apps lint rule) with hover.
// Omit `onClick` for a pure stat display. Selected styling intentionally beats
// hover. Supply the standard label/value/description slots, or pass `children`
// for a custom inner layout.

type StatCardVariant = "default" | "success" | "warning" | "error"
type StatTrendDirection = "up" | "down" | "flat"

interface StatCardTrend {
  dir: StatTrendDirection
  label: React.ReactNode
}

interface StatCardProps {
  label?: React.ReactNode
  value?: React.ReactNode
  description?: React.ReactNode
  /** @deprecated Use description. */
  sub?: React.ReactNode
  trend?: StatCardTrend
  icon?: React.ReactNode
  variant?: StatCardVariant
  selected?: boolean
  /** @deprecated Use selected. */
  active?: boolean
  /** Provide to make the card an interactive filter; omit for pure display. */
  onClick?: () => void
  /** Custom inner content; overrides label/value/description/trend/icon. */
  children?: React.ReactNode
  className?: string
}

const valueVariantClass: Record<StatCardVariant, string> = {
  default: "text-content-primary",
  success: "text-success-strong",
  warning: "text-warning-strong",
  error: "text-error-strong",
}

const trendClass: Record<StatTrendDirection, string> = {
  up: "text-success-strong",
  down: "text-error-strong",
  flat: "text-content-tertiary",
}

function StatCard({
  label,
  value,
  description,
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- back-compat alias, resolved into `description` below
  sub,
  trend,
  icon,
  variant = "default",
  selected,
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- back-compat alias, resolved into `selected` below
  active,
  onClick,
  children,
  className,
}: StatCardProps) {
  const interactive = Boolean(onClick)
  const isSelected = selected ?? active ?? false
  const resolvedDescription = description ?? sub

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? isSelected : undefined}
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
        "min-h-stat-card rounded-xl border px-4 py-3.5 text-left transition-colors",
        interactive && "cursor-pointer",
        isSelected
          ? "border-primary-500 bg-primary-50 ring-2 ring-primary-500/10"
          : "border-line-subtle bg-surface-2 shadow-1",
        interactive && !isSelected && "hover:bg-surface-hover",
        className,
      )}
    >
      {children ?? (
        <>
          <div className="flex items-start justify-between gap-3">
            <div
              className={cn(
                "text-xs font-medium tracking-overline uppercase",
                isSelected ? "text-primary-700" : "text-content-tertiary",
              )}
            >
              {label}
            </div>
            {icon ? (
              <div className={cn("shrink-0 text-content-tertiary", isSelected && "text-primary-700")}>
                {icon}
              </div>
            ) : null}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className={cn(
                "font-mono text-2xl font-semibold tracking-tight tabular-nums",
                isSelected ? "text-primary-700" : valueVariantClass[variant],
              )}
            >
              {value}
            </span>
            {trend ? (
              <span className={cn("text-xs font-medium", trendClass[trend.dir])}>
                {trend.label}
              </span>
            ) : null}
          </div>
          {resolvedDescription ? (
            <div className="mt-1 text-xs text-content-tertiary">{resolvedDescription}</div>
          ) : null}
        </>
      )}
    </div>
  )
}

function StatGrid({
  className,
  cols = 4,
  ...props
}: React.ComponentProps<"div"> & { cols?: 2 | 3 | 4 }) {
  return (
    <div
      className={cn(
        cols === 2 && "grid grid-cols-2 gap-3",
        cols === 3 && "grid grid-cols-3 gap-3",
        cols === 4 && "grid grid-cols-2 gap-3 sm:grid-cols-4",
        className,
      )}
      {...props}
    />
  )
}

export {
  StatCard,
  StatGrid,
  type StatCardProps,
  type StatCardTrend,
  type StatCardVariant,
  type StatTrendDirection,
}
