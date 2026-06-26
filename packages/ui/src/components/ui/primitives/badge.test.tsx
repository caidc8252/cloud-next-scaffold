// @vitest-environment jsdom
import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Badge } from "./badge"

describe("Badge — TOMS shapes", () => {
  it("defaults to pill radius for status labels", () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText("Active").className).toContain("rounded-full")
  })

  it("supports tag chips as a badge shape", () => {
    render(<Badge shape="tag">SKU-01</Badge>)
    const badge = screen.getByText("SKU-01")
    expect(badge.className).toContain("rounded-sm")
    expect(badge.className).toContain("font-mono")
  })
})
