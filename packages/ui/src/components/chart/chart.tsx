"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "../../lib/utils"

/* ─────────────────────────────────────────────────────────────
   Recharts v3 + TOMS DS 2.0 chart core (container + theming).
   Tooltip/legend/state components live in sibling files; all are
   re-exported from ./index. Adapted from the shadcn chart recipe:
   - dark selector is `.dark, [data-theme="dark"]` (not bare `.dark`)
   - series with no explicit color auto-take the TOMS ordinal palette
     `--color-chart-{1..8}` by declaration order (cycles past 8)
   The visual contract (dashed grid, mono axes, dark tooltip, polar grid,
   brush, skeleton) is applied to Recharts' own SVG in
   component-defaults.css under [data-slot="chart"].
   ───────────────────────────────────────────────────────────── */

/** Series-key → display meta. A series either pins an explicit `color`,
 *  a per-theme `{ light, dark }` pair, or neither (→ ordinal palette). */
export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode
    icon?: React.ComponentType<{ className?: string }>
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<ChartTheme, string> }
  )
}

type ChartTheme = "light" | "dark"
/** Selectors this repo uses to mark the dark canvas (see styles/index.css). */
const DARK_PREFIXES = [".dark", '[data-theme="dark"]'] as const

type ChartContextValue = { config: ChartConfig }

const ChartContext = React.createContext<ChartContextValue | null>(null)

export function useChart(): ChartContextValue {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }
  return context
}

/**
 * Resolve every series to a CSS value for the given theme:
 * explicit `theme[theme]` → explicit `color` → ordinal `--color-chart-{n}`.
 * Pure + exported so the palette fallback can be unit-tested without a DOM.
 */
export function buildChartVars(
  config: ChartConfig,
  theme: ChartTheme,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(config).map(([key, item], index) => {
      const explicit =
        item.theme?.[theme] ?? ("color" in item ? item.color : undefined)
      const fallback = `var(--color-chart-${(index % 8) + 1})`
      return [`--color-${key}`, explicit ?? fallback]
    }),
  )
}

/** Emits a scoped <style> block setting `--color-<key>` on `[data-chart=id]`. */
export function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const block = (vars: Record<string, string>) =>
    Object.entries(vars)
      .map(([name, value]) => `  ${name}: ${value};`)
      .join("\n")

  const rules = [`[data-chart="${id}"] {\n${block(buildChartVars(config, "light"))}\n}`]

  // Only emit a dark block when a series actually pins per-theme colors —
  // the ordinal palette already flips via the [data-theme="dark"] token block.
  if (Object.values(config).some((item) => item.theme)) {
    const darkSelector = DARK_PREFIXES.map((p) => `${p} [data-chart="${id}"]`).join(", ")
    rules.push(`${darkSelector} {\n${block(buildChartVars(config, "dark"))}\n}`)
  }

  return <style dangerouslySetInnerHTML={{ __html: rules.join("\n") }} />
}

export function ChartContainer({
  id,
  className,
  children,
  config,
  label,
  description,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  /** Accessible name for the chart region. When set, the container becomes
   *  `role="img"` with an sr-only title (spec "Accessibility"). Pair with
   *  `accessibilityLayer` on the Recharts chart for keyboard ← → stepping. */
  label?: React.ReactNode
  /** Longer sr-only description, exposed via `aria-describedby`. */
  description?: React.ReactNode
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"]
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`
  const titleId = `${chartId}-title`
  const descId = `${chartId}-desc`

  // Mount ResponsiveContainer only once the box has a real size, and seed it
  // with that size as `initialDimension`. Recharts' default initial dimension
  // is {-1,-1}, which makes its FIRST render warn "width(-1)…should be > 0"
  // (on the server, where there's no layout, and on the client's first frame).
  // Measuring first means it never renders at -1 — no warning, no size flash —
  // and the ResizeObserver keeps it working through hidden→shown + resize.
  const ref = React.useRef<HTMLDivElement>(null)
  const [size, setSize] = React.useState<{ width: number; height: number } | null>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (box && box.width > 0 && box.height > 0) {
        setSize((prev) =>
          prev && prev.width === box.width && prev.height === box.height
            ? prev
            : { width: box.width, height: box.height },
        )
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        data-slot="chart"
        data-chart={chartId}
        role={label ? "img" : undefined}
        aria-labelledby={label ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        className={cn(
          "flex aspect-video justify-center text-xs",
          className,
        )}
        {...props}
      >
        {label ? (
          <span id={titleId} className="sr-only">
            {label}
          </span>
        ) : null}
        {description ? (
          <span id={descId} className="sr-only">
            {description}
          </span>
        ) : null}
        <ChartStyle id={chartId} config={config} />
        {size ? (
          <RechartsPrimitive.ResponsiveContainer initialDimension={size}>
            {children}
          </RechartsPrimitive.ResponsiveContainer>
        ) : null}
      </div>
    </ChartContext.Provider>
  )
}

/* ─── Shared payload helpers (used by the tooltip + legend files) ─── */

/** Recharts injects these onto the cloned tooltip/legend content element. */
export type TooltipPayloadItem = {
  value?: number | string
  name?: string
  dataKey?: string | number
  color?: string
  fill?: string
  payload?: Record<string, unknown>
}

export type LegendPayloadItem = {
  value?: string
  dataKey?: string | number
  color?: string
  payload?: Record<string, unknown>
}

/**
 * The config key a payload item maps to. `key` may already be the config key,
 * or the name of a field (on the item or its nested data row) whose value is
 * the config key — this is what makes `nameKey` work for pie slices, where the
 * slice's config key lives in `item.payload[nameKey]`.
 */
export function resolveConfigKey(
  item: TooltipPayloadItem | LegendPayloadItem,
  key: string,
): string {
  const fields = item as Record<string, unknown>
  if (typeof fields[key] === "string") return fields[key] as string
  const nested =
    item.payload && typeof item.payload === "object"
      ? (item.payload as Record<string, unknown>)
      : undefined
  if (nested && typeof nested[key] === "string") return nested[key] as string
  return key
}

/** Resolve a config entry from a payload item. */
export function getPayloadConfigFromPayload(
  config: ChartConfig,
  item: TooltipPayloadItem | LegendPayloadItem,
  key: string,
): ChartConfig[string] | undefined {
  const configKey = resolveConfigKey(item, key)
  return config[configKey] ?? config[key]
}

/**
 * The swatch / indicator color for a series: the fill Recharts echoes back when
 * present, else the same `--color-<key>` variable the chart geometry uses —
 * derived from the *resolved* config key, so it works even when Recharts omits
 * the color on a payload item (which it does for some pie slices).
 */
export function resolveSeriesColor(
  item: TooltipPayloadItem | LegendPayloadItem,
  key: string,
): string {
  const fields = item as { color?: string; fill?: string }
  if (fields.color) return fields.color
  if (typeof fields.fill === "string") return fields.fill
  return `var(--color-${resolveConfigKey(item, key)})`
}
