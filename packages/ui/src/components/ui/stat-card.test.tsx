// @vitest-environment jsdom
import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StatCard } from "./stat-card"

describe("StatCard — TOMS stat-card scale", () => {
  it("uses the 92px / 12px-radius stat tile shell", () => {
    const { container } = render(<StatCard label="Active" value={42} />)
    const tile = container.firstElementChild
    expect(tile?.className).toContain("min-h-stat-card")
    expect(tile?.className).toContain("rounded-xl")
  })

  it("uses 12px label and 24px tabular value", () => {
    render(<StatCard label="Active" value={42} />)
    expect(screen.getByText("Active").className).toContain("text-xs")
    expect(screen.getByText("42").className).toContain("text-2xl")
    expect(screen.getByText("42").className).toContain("font-semibold")
    expect(screen.getByText("42").className).toContain("tabular-nums")
  })

  it("supports TOMS slots and tone coloring", () => {
    render(
      <StatCard
        label="Active"
        value={42}
        description="online now"
        trend={{ dir: "up", label: "+8%" }}
        tone="success"
      />,
    )
    expect(screen.getByText("online now")).toBeTruthy()
    expect(screen.getByText("+8%").className).toContain("text-success-strong")
    expect(screen.getByText("42").className).toContain("text-success-strong")
  })

  it("still honors the deprecated `variant` alias (default → neutral)", () => {
    const { rerender } = render(<StatCard label="A" value={7} variant="error" />)
    expect(screen.getByText("7").className).toContain("text-error-strong")
    rerender(<StatCard label="A" value={7} variant="default" />)
    expect(screen.getByText("7").className).toContain("text-content-primary")
  })

  it("lets `tone` win over a conflicting `variant`", () => {
    render(<StatCard label="A" value={9} variant="error" tone="success" />)
    expect(screen.getByText("9").className).toContain("text-success-strong")
  })
})
