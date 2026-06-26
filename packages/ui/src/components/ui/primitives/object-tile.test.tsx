// @vitest-environment jsdom
import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ObjectTile } from "./object-tile"
import { categoricalColorIndex } from "../../../lib/categorical-color"

describe("ObjectTile", () => {
  it("renders 2 initials derived from a name (first letter of the first two words)", () => {
    render(<ObjectTile name="com.acme.pos" />)
    expect(screen.getByText("CA")).toBeTruthy()
  })

  it("shows a label whole (short code mode)", () => {
    render(<ObjectTile label="N950" tone="auto" />)
    expect(screen.getByText("N950")).toBeTruthy()
  })

  it("auto tone applies the content-hashed cat class", () => {
    render(<ObjectTile label="S90" tone="auto" />)
    const bucket = categoricalColorIndex("S90") + 1
    const tile = screen.getByText("S90").parentElement!
    expect(tile.className).toContain(`bg-cat-${bucket}`)
    expect(tile.className).toContain(`text-cat-${bucket}-fg`)
    expect(tile.className).toContain("border-cat-line")
  })

  it("neutral tone (default) uses avatar tokens + soft border", () => {
    render(<ObjectTile name="Acme Corp" />)
    const tile = screen.getByText("AC").parentElement!
    expect(tile.className).toContain("bg-avatar-bg")
    expect(tile.className).toContain("text-avatar-fg")
    expect(tile.className).toContain("border-line-subtle")
  })

  it("defaults to the 40px (md) size → size-10 + rounded-lg", () => {
    render(<ObjectTile name="Acme Corp" />)
    const tile = screen.getByText("AC").parentElement!
    expect(tile.className).toContain("size-10")
    expect(tile.className).toContain("rounded-lg")
  })
})
