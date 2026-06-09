"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "../../lib/utils"

/* ─────────────────────────────────────────────────────────────
   Sparkline — a tiny inline trend (spec "Sparkline"): fixed size,
   no axes / grid / tooltip / legend, a single 1.5px round stroke.
   Standalone on purpose: renders a FIXED-size Recharts chart (no
   ResponsiveContainer / ChartContainer), so it mounts synchronously
   with no ResizeObserver — right for table cells, KPI tiles, etc.
   Round caps come from component-defaults.css [data-slot=chart-sparkline].
   ───────────────────────────────────────────────────────────── */

export interface ChartSparklineProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  /** Row objects; only `dataKey` is read. */
  data: Record<string, unknown>[]
  /** Numeric field to plot. */
  dataKey: string
  /** Fixed pixel width — sparklines are inline, not responsive. */
  width?: number
  /** Fixed pixel height. */
  height?: number
  /** Stroke (and area fill) color. Defaults to the first ordinal token. */
  color?: string
  /** `line` (default) or a filled `area`. */
  variant?: "line" | "area"
  /** Curve interpolation between points. */
  curve?: "monotone" | "linear" | "step"
}

export function ChartSparkline({
  data,
  dataKey,
  width = 120,
  height = 32,
  color = "var(--color-chart-1)",
  variant = "line",
  curve = "monotone",
  className,
  ...props
}: ChartSparklineProps) {
  // Small margin so the round stroke isn't clipped at the box edges.
  const margin = { top: 2, right: 2, bottom: 2, left: 2 }

  return (
    <div
      data-slot="chart-sparkline"
      className={cn("inline-block", className)}
      {...props}
    >
      {variant === "area" ? (
        <RechartsPrimitive.AreaChart width={width} height={height} data={data} margin={margin}>
          <RechartsPrimitive.Area
            dataKey={dataKey}
            type={curve}
            stroke={color}
            strokeWidth={1.5}
            fill={color}
            fillOpacity={0.16}
            dot={false}
            isAnimationActive={false}
          />
        </RechartsPrimitive.AreaChart>
      ) : (
        <RechartsPrimitive.LineChart width={width} height={height} data={data} margin={margin}>
          <RechartsPrimitive.Line
            dataKey={dataKey}
            type={curve}
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </RechartsPrimitive.LineChart>
      )}
    </div>
  )
}
