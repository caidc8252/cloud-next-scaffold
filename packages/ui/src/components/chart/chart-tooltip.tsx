"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "../../lib/utils"
import {
  getPayloadConfigFromPayload,
  resolveSeriesColor,
  useChart,
  type TooltipPayloadItem,
} from "./chart"

/** Pass `content={<ChartTooltipContent />}` to this (Recharts `Tooltip`). */
export const ChartTooltip = RechartsPrimitive.Tooltip

export interface ChartTooltipContentProps extends React.ComponentProps<"div"> {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: React.ReactNode
  /** Indicator shape next to each row. `none` defers to a config `icon`. */
  indicator?: "dot" | "line" | "dashed" | "none"
  hideLabel?: boolean
  hideIndicator?: boolean
  nameKey?: string
  labelKey?: string
  /** Render a summed "Total" row at the bottom (only for summable series). */
  showTotal?: boolean
  totalLabel?: React.ReactNode
  labelFormatter?: (
    label: React.ReactNode,
    payload: TooltipPayloadItem[],
  ) => React.ReactNode
  formatter?: (
    value: number | string | undefined,
    name: string,
    item: TooltipPayloadItem,
    index: number,
  ) => React.ReactNode
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  nameKey,
  labelKey,
  showTotal = false,
  totalLabel = "Total",
  labelFormatter,
  formatter,
}: ChartTooltipContentProps) {
  const { config } = useChart()

  if (!active || !payload?.length) return null

  const resolvedLabel = (() => {
    if (hideLabel) return null
    // Default: the tooltip header is the axis category (`label`, e.g. "Mar"),
    // optionally remapped through a config entry of that name.
    if (!labelKey && typeof label === "string") {
      const value = config[label]?.label ?? label
      return labelFormatter ? labelFormatter(value, payload) : value
    }
    const first = payload[0]
    const key = labelKey ?? String(first?.dataKey ?? first?.name ?? "value")
    const value = getPayloadConfigFromPayload(config, first, key)?.label
    if (value == null) return null
    return labelFormatter ? labelFormatter(value, payload) : value
  })()

  const total = showTotal
    ? payload.reduce((sum, it) => sum + (typeof it.value === "number" ? it.value : 0), 0)
    : null

  const renderValue = (value: number | string | undefined) =>
    typeof value === "number" ? value.toLocaleString() : value

  return (
    <div
      data-slot="chart-tooltip"
      className={cn(
        "grid min-w-32 items-stretch gap-1.5 rounded-md bg-chart-tooltip-bg px-2.5 py-1.5 text-xs text-chart-tooltip-fg shadow-4",
        className,
      )}
    >
      {resolvedLabel != null ? (
        <div className="font-mono font-medium">{resolvedLabel}</div>
      ) : null}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = nameKey ?? String(item.name ?? item.dataKey ?? "value")
          const itemConfig = getPayloadConfigFromPayload(config, item, key)
          const indicatorColor = resolveSeriesColor(item, key)
          const name = itemConfig?.label ?? item.name ?? key
          const Icon = itemConfig?.icon

          return (
            <div
              key={`${key}-${index}`}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                {Icon && !hideIndicator ? (
                  <Icon className="size-3.5 shrink-0 opacity-70" />
                ) : hideIndicator || indicator === "none" ? null : (
                  <span
                    aria-hidden
                    className={cn(
                      "shrink-0",
                      indicator === "dot" && "size-2.5 rounded-xs",
                      indicator === "line" && "h-3 w-1 rounded-xs",
                      indicator === "dashed" && "h-0 w-2.5 border-t-2 border-dashed",
                    )}
                    style={
                      indicator === "dashed"
                        ? { borderColor: indicatorColor }
                        : { backgroundColor: indicatorColor }
                    }
                  />
                )}
                <span className="truncate font-mono opacity-80">{name}</span>
              </div>
              <span className="font-mono font-semibold tabular-nums">
                {formatter
                  ? formatter(item.value, String(name), item, index)
                  : renderValue(item.value)}
              </span>
            </div>
          )
        })}
      </div>
      {total != null ? (
        <div className="mt-1 flex items-center justify-between gap-3 border-t border-white/15 pt-1.5 font-mono">
          <span className="opacity-80">{totalLabel}</span>
          <span className="font-semibold tabular-nums">{total.toLocaleString()}</span>
        </div>
      ) : null}
    </div>
  )
}
