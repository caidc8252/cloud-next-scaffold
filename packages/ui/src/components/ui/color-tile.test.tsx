// @vitest-environment jsdom
import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ColorTile } from "./color-tile"
import { categoricalColorIndex } from "../../lib/categorical-color"

describe("ColorTile", () => {
  it("renders the full label, not initials", () => {
    render(<ColorTile label="N950 Pro Max" />)
    expect(screen.getByText("N950 Pro Max")).toBeTruthy()
  })

  it("is a wrapping square with a soft tint and a shared hairline", () => {
    render(<ColorTile label="X900" />)
    const label = screen.getByText("X900")
    // The label wraps inside an inner span; shape + tint live on the outer tile.
    expect(label.className).toContain("break-words")
    const tile = label.parentElement!
    expect(tile.className).toContain("aspect-square")
    expect(tile.className).toContain("border-cat-line")
  })

  it("derives a soft-tint bg + same-hue ink from the label hash", () => {
    render(<ColorTile label="S90" />)
    const bucket = categoricalColorIndex("S90") + 1
    const tile = screen.getByText("S90").parentElement!
    expect(tile.className).toContain(`bg-cat-${bucket}`)
    expect(tile.className).toContain(`text-cat-${bucket}-fg`)
  })

  it("keys the color on colorSeed when provided, independent of the label", () => {
    render(<ColorTile label="display text" colorSeed="N950" />)
    const bucket = categoricalColorIndex("N950") + 1
    expect(screen.getByText("display text").parentElement!.className).toContain(`bg-cat-${bucket}`)
  })
})
