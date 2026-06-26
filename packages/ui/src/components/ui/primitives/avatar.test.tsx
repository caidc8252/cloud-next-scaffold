// @vitest-environment jsdom
import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Avatar, AvatarFallback } from "./avatar"

describe("Avatar — circular people primitive", () => {
  it("stays circular and defaults to the 40px (size-10) md tile", () => {
    const { container } = render(<Avatar name="Acme Corp" />)
    const root = container.firstElementChild
    expect(root?.className).toContain("rounded-full")
    expect(root?.className).toContain("size-10")
  })

  it("keeps the existing size steps working", () => {
    const cases: Array<[string, string]> = [
      ["sm", "size-control-xs"],
      ["lg", "size-9"],
      ["xl", "size-12"],
    ]
    for (const [size, cls] of cases) {
      const { container } = render(<Avatar size={size as "sm" | "lg" | "xl"} />)
      expect(container.firstElementChild?.className).toContain(cls)
    }
  })

  it("derives 2-letter initials from a name prop", () => {
    render(<Avatar name="Acme Corp" />)
    expect(screen.getByText("AC")).toBeTruthy()
  })

  it("derives initials across the name separators (. + _ - /)", () => {
    render(<Avatar name="next.js" />)
    expect(screen.getByText("NJ")).toBeTruthy()
  })

  it("still honors explicit AvatarFallback children", () => {
    render(
      <Avatar name="Acme Corp">
        <AvatarFallback>ZZ</AvatarFallback>
      </Avatar>,
    )
    expect(screen.getByText("ZZ")).toBeTruthy()
    expect(screen.queryByText("AC")).toBeNull()
  })

  it("uses the neutral avatar tokens (not brand ink) for the fallback", () => {
    render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    )
    const fallback = screen.getByText("AB")
    expect(fallback.className).toContain("bg-avatar-bg")
    expect(fallback.className).toContain("text-avatar-fg")
    expect(fallback.className).not.toContain("brand-mono")
  })
})
