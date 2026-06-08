"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "../../lib/utils"
import {
  getPayloadConfigFromPayload,
  resolveConfigKey,
  resolveSeriesColor,
  useChart,
  type LegendPayloadItem,
} from "./chart"

/** Pass `content={<ChartLegendContent />}` to this (Recharts `Legend`). */
export const ChartLegend = RechartsPrimitive.Legend

export interface ChartLegendContentProps {
  className?: string
  payload?: LegendPayloadItem[]
  verticalAlign?: "top" | "bottom"
  hideIcon?: boolean
  nameKey?: string
  /** Swatch shape — `line` for line/area series (spec `__dot--line`). */
  indicator?: "dot" | "line"
  /** Series keys currently toggled off. Pass with `onToggle` for an
   *  interactive legend; the consumer applies `hide` to the matching series. */
  hidden?: Record<string, boolean>
  /** When provided, items become `aria-pressed` toggle buttons (spec
   *  "Legend — interactive"); called with the resolved series key. */
  onToggle?: (seriesKey: string) => void
}

export function ChartLegendContent({
  payload,
  verticalAlign = "bottom",
  hideIcon = false,
  nameKey,
  indicator = "dot",
  hidden,
  onToggle,
  className,
}: ChartLegendContentProps) {
  const { config } = useChart()

  if (!payload?.length) return null

  return (
    <div
      data-slot="chart-legend"
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className,
      )}
    >
      {payload.map((item, index) => {
        const rawKey = nameKey ?? String(item.dataKey ?? item.value ?? "value")
        const seriesKey = resolveConfigKey(item, rawKey)
        const itemConfig = getPayloadConfigFromPayload(config, item, rawKey)
        const Icon = itemConfig?.icon
        const off = hidden?.[seriesKey] ?? false

        const swatch =
          Icon && !hideIcon ? (
            <Icon className="size-3 shrink-0" />
          ) : hideIcon ? null : (
            <span
              aria-hidden
              className={cn(
                "shrink-0 rounded-xs",
                indicator === "line" ? "h-0.5 w-3" : "size-2.5",
              )}
              style={{
                backgroundColor: off
                  ? "var(--color-content-tertiary)"
                  : resolveSeriesColor(item, rawKey),
              }}
            />
          )

        const label = itemConfig?.label ?? item.value
        const baseClass =
          "flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 font-mono text-2xs text-content-secondary"

        if (onToggle) {
          return (
            <button
              key={`${seriesKey}-${index}`}
              type="button"
              aria-pressed={!off}
              onClick={() => onToggle(seriesKey)}
              className={cn(
                baseClass,
                "cursor-pointer transition-colors hover:bg-surface-hover",
                off && "text-content-tertiary opacity-60",
              )}
            >
              {swatch}
              {label}
            </button>
          )
        }

        return (
          <div key={`${seriesKey}-${index}`} className={baseClass}>
            {swatch}
            {label}
          </div>
        )
      })}
    </div>
  )
}
