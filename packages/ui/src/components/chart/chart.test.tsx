// @vitest-environment jsdom
import * as React from "react"
import { render } from "@testing-library/react"
import { beforeAll, describe, expect, it } from "vitest"
import { BarChart, Bar } from "recharts"

import { ChartContainer, buildChartVars, useChart, type ChartConfig } from "./chart"

// Recharts' ResponsiveContainer instantiates a ResizeObserver on mount, which
// jsdom doesn't provide. A no-op mock lets the wrapper + injected <style> mount
// (the chart geometry stays empty in jsdom — that's not what we assert on).
beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver ??=
    ResizeObserverMock as unknown as typeof globalThis.ResizeObserver
})

describe("buildChartVars — TOMS ordinal palette fallback", () => {
  it("assigns --color-chart-{1..8} by declaration order when no color is set", () => {
    const vars = buildChartVars({ a: {}, b: {}, c: {} }, "light")
    expect(vars).toEqual({
      "--color-a": "var(--color-chart-1)",
      "--color-b": "var(--color-chart-2)",
      "--color-c": "var(--color-chart-3)",
    })
  })

  it("lets an explicit color win, while siblings keep their ordinal index", () => {
    const vars = buildChartVars({ a: { color: "red" }, b: {} }, "light")
    expect(vars["--color-a"]).toBe("red")
    // b is index 1 → chart-2 regardless of a being explicit
    expect(vars["--color-b"]).toBe("var(--color-chart-2)")
  })

  it("splits per-theme colors by the requested theme", () => {
    const config: ChartConfig = { a: { theme: { light: "L", dark: "D" } } }
    expect(buildChartVars(config, "light")["--color-a"]).toBe("L")
    expect(buildChartVars(config, "dark")["--color-a"]).toBe("D")
  })

  it("cycles back to chart-1 past the 8th series", () => {
    const config = Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [`k${i}`, {}]),
    ) as ChartConfig
    const vars = buildChartVars(config, "light")
    expect(vars["--color-k0"]).toBe("var(--color-chart-1)")
    expect(vars["--color-k7"]).toBe("var(--color-chart-8)")
    expect(vars["--color-k8"]).toBe("var(--color-chart-1)")
  })
})

describe("ChartContainer — slot + scoped style injection", () => {
  it("renders data-slot=chart with a chart-scoped id and a <style> of vars", () => {
    const { container } = render(
      <ChartContainer config={{ card: { label: "Card" } }}>
        <BarChart data={[]}>
          <Bar dataKey="card" />
        </BarChart>
      </ChartContainer>,
    )
    const root = container.querySelector('[data-slot="chart"]')
    expect(root).not.toBeNull()
    const chartId = root?.getAttribute("data-chart") ?? ""
    expect(chartId).toMatch(/^chart-/)

    const css = container.querySelector("style")?.innerHTML ?? ""
    expect(css).toContain(`[data-chart="${chartId}"]`)
    expect(css).toContain("--color-card: var(--color-chart-1)")
  })

  it("omits a dark block for the ordinal palette (it flips via tokens)", () => {
    const { container } = render(
      <ChartContainer config={{ card: { label: "Card" } }}>
        <BarChart data={[]}>
          <Bar dataKey="card" />
        </BarChart>
      </ChartContainer>,
    )
    expect(container.querySelector("style")?.innerHTML).not.toContain(
      '[data-theme="dark"]',
    )
  })

  it("emits a proper dark selector list when a series pins per-theme colors", () => {
    const { container } = render(
      <ChartContainer config={{ card: { theme: { light: "#111", dark: "#eee" } } }}>
        <BarChart data={[]}>
          <Bar dataKey="card" />
        </BarChart>
      </ChartContainer>,
    )
    const css = container.querySelector("style")?.innerHTML ?? ""
    // The fix: dark selectors are fully qualified, never a bare global `.dark {`
    expect(css).toContain('[data-theme="dark"] [data-chart=')
    expect(css).toContain(".dark [data-chart=")
    expect(css).toContain("#eee")
  })
})

describe("useChart", () => {
  it("throws when used outside <ChartContainer />", () => {
    function Orphan() {
      useChart()
      return null
    }
    expect(() => render(<Orphan />)).toThrow(/ChartContainer/)
  })
})
