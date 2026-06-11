"use client"

import * as React from "react"
import { Bar, Rectangle, type BarShapeProps } from "recharts"

// Bars should round their FREE end by default (4px) and stay flat where they
// meet the axis — that's the modern bar-chart look, and consumers shouldn't
// have to hand-type a `radius` array every time. The hard part is stacking:
// Recharts' `radius` is per-series and static, so naively reusing 4px paints a
// rounded corner on every segment, including the ones buried mid-stack. The
// correct behaviour is to round ONLY the free end of the top-most *visible*
// segment per datum (a series can be 0 for one column or hidden via the
// legend), and leave everything else — middle segments and the axis base —
// square. `ChartBar` bakes that default in; the shape factory powers the
// stacked case.

const DEFAULT_BAR_RADIUS = 4

export type StackedBarRadius = [number, number, number, number]

export type StackedBarOrientation = "vertical" | "horizontal"

export interface StackedBarShapeOptions {
  /** Stack series keys in declaration order (last = top for vertical / right for horizontal). */
  keys: string[]
  /** Free-end corner radius in px. */
  radius?: number
  /**
   * `"vertical"` (default) for upward-growing bars; `"horizontal"` for a
   * `layout="vertical"` chart whose bars grow left→right.
   */
  orientation?: StackedBarOrientation
  /** Series currently hidden (e.g. via legend toggle) so they're skipped when picking the top. */
  hiddenKeys?: Iterable<string>
}

function toPositiveNumber(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
}

/** Corners for a flat (un-rounded) segment. */
const FLAT: StackedBarRadius = [0, 0, 0, 0]

/**
 * Round only the free end of the top-most *visible, non-zero* segment of the
 * datum; the axis-adjacent end and every middle/bottom segment stay square.
 * For a single (non-stacked) series the bar is always its own top, so its free
 * end rounds. Negative values are treated as absent — diverging stacks are
 * intentionally out of scope.
 */
export function getStackedBarRadius(
  seriesKey: string,
  payload: Record<string, unknown> | undefined,
  options: StackedBarShapeOptions,
): StackedBarRadius {
  const radius = options.radius ?? DEFAULT_BAR_RADIUS
  const hidden = new Set(options.hiddenKeys ?? [])

  const visible = options.keys.filter(
    (key) => !hidden.has(key) && toPositiveNumber(payload?.[key]) > 0,
  )

  // Only the last visible series owns the free end of the stack.
  if (visible[visible.length - 1] !== seriesKey) return FLAT

  // [topLeft, topRight, bottomRight, bottomLeft]. Horizontal bars grow left→right
  // (axis on the left), so the free end is the right corners; vertical bars grow
  // upward (axis at the base), so the free end is the top corners.
  return options.orientation === "horizontal"
    ? [0, radius, radius, 0]
    : [radius, radius, 0, 0]
}

/** Static radius for a non-stacked bar: free end rounded, axis end flat. */
function getSingleBarRadius(
  radius: number,
  orientation: StackedBarOrientation,
): StackedBarRadius {
  return orientation === "horizontal"
    ? [0, radius, radius, 0]
    : [radius, radius, 0, 0]
}

/**
 * Build a stack-aware bar shape. Returns a factory keyed by the series' own
 * `dataKey` (Recharts doesn't pass it into the shape, so it must be supplied),
 * yielding a custom-shape render function for the `<Bar shape>` prop. Prefer
 * {@link ChartBar} unless you need to compose the raw `<Bar>` yourself.
 */
export function createStackedBarShape(
  options: StackedBarShapeOptions,
): (seriesKey: string) => (props: BarShapeProps) => React.ReactElement {
  return (seriesKey) =>
    function StackedBarShape(props: BarShapeProps) {
      const corners = getStackedBarRadius(seriesKey, props.payload, options)
      return <Rectangle {...props} radius={corners} />
    }
}

type RechartsBarProps = React.ComponentProps<typeof Bar>

/** Per-datum value resolver — replaces the deprecated `<Cell>` for bars. */
export type BarCellResolver<T> = (
  payload: Record<string, unknown>,
  index: number,
) => T

export interface ChartBarProps
  extends Omit<RechartsBarProps, "radius" | "shape" | "fill"> {
  /** Layout of the chart the bar lives in. `"horizontal"` ⇒ Recharts `layout="vertical"`. */
  orientation?: StackedBarOrientation
  /**
   * Stack series keys in declaration order. Provide this on each bar of a stack
   * (alongside the usual `stackId`) to enable stack-aware rounding — only the
   * visible top segment rounds. Omit for non-stacked bars.
   */
  stackKeys?: string[]
  /** Series currently hidden via legend toggle, so they're skipped when picking the top. */
  hiddenKeys?: Iterable<string>
  /** Free-end corner radius in px (default 4). */
  radius?: number
  /** Static color, or a per-datum resolver — replaces a `<Cell fill>` child. */
  fill?: string | BarCellResolver<string>
  /** Per-datum className resolver (e.g. selected / dimmed states) — replaces a `<Cell className>` child. */
  cellClassName?: string | BarCellResolver<string>
}

/**
 * Bar with the team default baked in: 4px on the free end, flat against the
 * axis. Drop-in for Recharts `<Bar>` inside `@cloud/ui` charts.
 *
 * - Pass `stackKeys` (plus the usual `stackId`) on stacked bars to round only
 *   the visible top segment per column instead of every segment.
 * - Pass a `fill` / `cellClassName` function to colour or style bars per datum
 *   — the supported replacement for the now-deprecated `<Cell>` child.
 */
export function ChartBar({
  orientation = "vertical",
  stackKeys,
  hiddenKeys,
  radius = DEFAULT_BAR_RADIUS,
  fill,
  cellClassName,
  dataKey,
  ...rest
}: ChartBarProps) {
  // A function fill becomes the legend/base color only when static; per-datum
  // colors live in the shape below.
  const staticFill = typeof fill === "string" ? fill : undefined

  if (stackKeys && typeof dataKey === "string") {
    const shape = createStackedBarShape({ keys: stackKeys, radius, orientation, hiddenKeys })(
      dataKey,
    )
    return <Bar dataKey={dataKey} fill={staticFill} {...rest} shape={shape} />
  }

  // Per-datum fill / className (the `<Cell>` replacement) needs a shape so each
  // rectangle can read its own payload; otherwise a static radius array suffices.
  if (typeof fill === "function" || cellClassName != null) {
    const corners = getSingleBarRadius(radius, orientation)
    return (
      <Bar
        dataKey={dataKey}
        fill={staticFill}
        {...rest}
        shape={function ChartBarCell(props: BarShapeProps) {
          const payload = (props.payload ?? {}) as Record<string, unknown>
          const resolvedFill = typeof fill === "function" ? fill(payload, props.index) : fill
          const resolvedClass =
            typeof cellClassName === "function"
              ? cellClassName(payload, props.index)
              : cellClassName
          return (
            <Rectangle
              {...props}
              radius={corners}
              fill={resolvedFill ?? props.fill}
              className={resolvedClass}
            />
          )
        }}
      />
    )
  }

  return (
    <Bar
      dataKey={dataKey}
      fill={staticFill}
      {...rest}
      radius={getSingleBarRadius(radius, orientation)}
    />
  )
}
