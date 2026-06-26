// @vitest-environment jsdom
import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { KvGrid, KeyValue } from "./key-value"

describe("KeyValue — TOMS detail KV field", () => {
  it("renders the label above the value", () => {
    render(<KeyValue label="Reference" value="REF-0042" />)
    const label = screen.getByText("Reference")
    const value = screen.getByText("REF-0042")
    expect(label.tagName).toBe("DT")
    expect(value.tagName).toBe("DD")
    // 12 / 500 / tertiary overline label
    expect(label.className).toContain("text-xs")
    expect(label.className).toContain("font-medium")
    expect(label.className).toContain("text-content-tertiary")
  })

  it("renders a plain value as body text", () => {
    render(<KeyValue label="Name" value="Record title" />)
    const value = screen.getByText("Record title")
    expect(value.className).toContain("text-md")
    expect(value.className).toContain("text-content-primary")
    expect(value.className).not.toContain("font-mono")
  })

  it("mono adds font-mono + tabular-nums for IDs / dates / amounts", () => {
    render(<KeyValue label="Amount" value="$1,200.00" mono />)
    const value = screen.getByText("$1,200.00")
    expect(value.className).toContain("font-mono")
    expect(value.className).toContain("tabular-nums")
  })

  it("renders an em dash for an empty value", () => {
    render(<KeyValue label="Notes" value="" />)
    const value = screen.getByText("—")
    expect(value.className).toContain("text-content-tertiary")
  })

  it("renders an em dash for a nullish value", () => {
    render(<KeyValue label="Notes" value={undefined} />)
    expect(screen.getByText("—")).toBeTruthy()
  })

  it("wide spans the whole row via col-span-full", () => {
    const { container } = render(<KeyValue label="Address" value="1 Main St" wide />)
    const cell = container.firstElementChild
    expect(cell?.className).toContain("col-span-full")
  })

  it("KvGrid is an auto-fit <dl> with legal spacing", () => {
    const { container } = render(
      <KvGrid>
        <KeyValue label="Name" value="A" />
      </KvGrid>,
    )
    const grid = container.firstElementChild
    expect(grid?.tagName).toBe("DL")
    expect(grid?.className).toContain("grid-auto-fit-kv")
    expect(grid?.className).toContain("gap-4")
    expect(grid?.className).toContain("gap-y-5")
  })
})
