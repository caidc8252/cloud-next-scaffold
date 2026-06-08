import * as React from "react"

import { cn } from "../../lib/utils"

/**
 * Shimmer placeholder for the whole chart area while data is loading
 * (spec "Loading & empty" · `.tds-chart-skeleton`). The shimmer gradient +
 * animation live in component-defaults.css under [data-slot="chart-skeleton"].
 */
export function ChartSkeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chart-skeleton"
      role="status"
      aria-busy="true"
      className={cn("aspect-video w-full rounded-md", className)}
      {...props}
    />
  )
}

export interface ChartEmptyProps extends Omit<React.ComponentProps<"div">, "title"> {
  /** Headline, e.g. "No transactions in range." */
  title: React.ReactNode
  /** Secondary line — guidance and/or a verb-first reset action. */
  description?: React.ReactNode
  /** Defaults to a no-data line-chart glyph; pass `null` to hide. */
  icon?: React.ReactNode
}

const DEFAULT_EMPTY_ICON = (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M3 3v18h18" />
    <path d="M7 14l3-3 3 3 5-5" strokeDasharray="3 3" />
  </svg>
)

/**
 * Centered empty state for "no data after filter" (spec `.tds-chart-empty`):
 * icon + one-line headline + optional verb-first action.
 */
export function ChartEmpty({
  title,
  description,
  icon = DEFAULT_EMPTY_ICON,
  className,
  ...props
}: ChartEmptyProps) {
  return (
    <div
      data-slot="chart-empty"
      className={cn(
        "flex aspect-video w-full flex-col items-center justify-center gap-1 p-10 text-center text-xs text-content-tertiary",
        className,
      )}
      {...props}
    >
      {icon}
      <b className="text-sm font-medium text-content-primary">{title}</b>
      {description ? <span>{description}</span> : null}
    </div>
  )
}
