// @vitest-environment jsdom
import * as React from "react"
import { render } from "@testing-library/react"
import { beforeAll, describe, expect, it } from "vitest"
import { BarChart, Bar } from "recharts"

import { ChartContainer, buildChartVars, useChart, type ChartConfig } from "./chart"
import { ChartSparkline } from "./chart-sparkline"

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

describe("ChartContainer — accessibility (spec 'Accessibility')", () => {
  it("becomes role=img with sr-only title/desc wired via aria when labelled", () => {
    const { container } = render(
      <ChartContainer
        config={{ card: {} }}
        label="Revenue by month"
        description="Card vs wallet, Jan–Jun"
      >
        <BarChart data={[]}>
          <Bar dataKey="card" />
        </BarChart>
      </ChartContainer>,
    )
    const root = container.querySelector('[data-slot="chart"]')
    expect(root?.getAttribute("role")).toBe("img")
    const titleId = root?.getAttribute("aria-labelledby") ?? ""
    const descId = root?.getAttribute("aria-describedby") ?? ""
    expect(container.querySelector(`#${titleId}`)?.textContent).toBe("Revenue by month")
    expect(container.querySelector(`#${descId}`)?.textContent).toBe(
      "Card vs wallet, Jan–Jun",
    )
  })

  it("omits role/aria when no label is provided", () => {
    const { container } = render(
      <ChartContainer config={{ card: {} }}>
        <BarChart data={[]}>
          <Bar dataKey="card" />
        </BarChart>
      </ChartContainer>,
    )
    const root = container.querySelector('[data-slot="chart"]')
    expect(root?.getAttribute("role")).toBeNull()
    expect(root?.getAttribute("aria-labelledby")).toBeNull()
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

describe("ChartSparkline — fixed-size, axis-free inline trend (spec 'Sparkline')", () => {
  const data = [{ v: 3 }, { v: 7 }, { v: 5 }, { v: 9 }, { v: 6 }]

  it("renders a fixed-size svg with the line layer and no cartesian axes", () => {
    const { container } = render(
      <ChartSparkline data={data} dataKey="v" width={120} height={32} />,
    )
    expect(container.querySelector('[data-slot="chart-sparkline"]')).not.toBeNull()
    const svg = container.querySelector("svg")
    expect(svg?.getAttribute("width")).toBe("120")
    expect(svg?.getAttribute("height")).toBe("32")
    // Sparkline contract: a series line, but no axes / grid.
    expect(container.querySelector(".recharts-line")).not.toBeNull()
    expect(container.querySelector(".recharts-cartesian-axis")).toBeNull()
  })

  it("renders an area layer for variant='area'", () => {
    const { container } = render(
      <ChartSparkline data={data} dataKey="v" variant="area" />,
    )
    expect(container.querySelector(".recharts-area")).not.toBeNull()
    expect(container.querySelector(".recharts-cartesian-axis")).toBeNull()
  })
})
