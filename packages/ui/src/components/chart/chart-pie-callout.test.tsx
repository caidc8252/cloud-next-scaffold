import { describe, expect, it } from "vitest"

import {
  formatPieCalloutValue,
  getPieCalloutGeometry,
  resolvePieCalloutLineColor,
  resolvePieCalloutName,
} from "./chart-pie-callout"

describe("getPieCalloutGeometry", () => {
  it("builds a right-side elbow line and text anchor from sector geometry", () => {
    const geometry = getPieCalloutGeometry(
      { cx: 100, cy: 100, midAngle: 0, outerRadius: 50 },
      { offset: 10, elbowLength: 20, labelGap: 5 },
    )

    expect(geometry).toEqual({
      startX: 150,
      startY: 100,
      elbowX: 160,
      elbowY: 100,
      endX: 180,
      endY: 100,
      labelX: 185,
      labelY: 100,
      textAnchor: "start",
    })
  })

  it("builds a left-side elbow line and end-aligned text", () => {
    const geometry = getPieCalloutGeometry(
      { cx: 100, cy: 100, midAngle: 180, outerRadius: 50 },
      { offset: 10, elbowLength: 20, labelGap: 5 },
    )

    expect(geometry?.textAnchor).toBe("end")
    expect(geometry?.startX).toBe(50)
    expect(geometry?.elbowX).toBe(40)
    expect(geometry?.endX).toBe(20)
    expect(geometry?.labelX).toBe(15)
  })

  it("returns null when Recharts has not provided numeric polar props", () => {
    expect(getPieCalloutGeometry({ cx: "50%", cy: 100, midAngle: 0 })).toBeNull()
  })

  it("accepts Recharts labelLine points and adds the horizontal callout segment", () => {
    const geometry = getPieCalloutGeometry(
      {
        cx: 100,
        points: [
          { x: 150, y: 100 },
          { x: 160, y: 96 },
        ],
      },
      { elbowLength: 20, labelGap: 5 },
    )

    expect(geometry).toMatchObject({
      startX: 150,
      startY: 100,
      elbowX: 160,
      elbowY: 96,
      endX: 180,
      endY: 96,
      labelX: 185,
      labelY: 96,
      textAnchor: "start",
    })
  })
})

describe("pie callout display helpers", () => {
  it("resolves payload keys through chart config labels", () => {
    expect(
      resolvePieCalloutName(
        { card: { label: "Card" } },
        { payload: { method: "card" } },
        "method",
      ),
    ).toBe("Card")
  })

  it("falls back to the raw payload key when config has no label", () => {
    expect(
      resolvePieCalloutName({}, { payload: { method: "wallet" } }, "method"),
    ).toBe("wallet")
  })

  it("formats numeric values with locale grouping by default", () => {
    expect(formatPieCalloutValue(1200)).toBe("1,200")
    expect(formatPieCalloutValue("n/a")).toBe("n/a")
  })

  it("uses Recharts' labelLine stroke when fill is none", () => {
    expect(resolvePieCalloutLineColor({ fill: "none", stroke: "var(--color-card)" })).toBe(
      "var(--color-card)",
    )
  })
})
