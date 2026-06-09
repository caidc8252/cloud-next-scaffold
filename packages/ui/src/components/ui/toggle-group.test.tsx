// @vitest-environment jsdom
import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Toggle } from "./toggle"
import { ToggleGroup } from "./toggle-group"

describe("ToggleGroup — variants", () => {
  it("plain variant only provides layout and does not use connected-control classes", () => {
    render(
      <ToggleGroup type="single" variant="plain" value="a">
        <Toggle value="a">A</Toggle>
      </ToggleGroup>,
    )

    const group = screen.getByText("A").parentElement
    expect(group?.getAttribute("data-variant")).toBe("plain")
    expect(group?.className).toContain("flex")
    expect(group?.className).toContain("gap-2")
    expect(group?.className).not.toContain("overflow-hidden")
    expect(group?.className).not.toContain("bg-surface-3")
  })
})
