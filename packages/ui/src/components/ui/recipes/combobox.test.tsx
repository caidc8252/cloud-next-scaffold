// @vitest-environment jsdom
import * as React from "react"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { Combobox, type ComboboxOption } from "./combobox"

const OPTIONS: ComboboxOption[] = [
  { value: "a", label: "Apple" },
  { value: "b", label: "Banana" },
  { value: "c", label: "Cherry" },
  { value: "d", label: "Durian" },
]

afterEach(cleanup)

describe("Combobox — multi-select chips", () => {
  it("renders one removable chip per selected value", () => {
    render(
      <Combobox multiple options={OPTIONS} value={["a", "b"]} onValueChange={() => {}} />,
    )
    // Each selected label is shown as a chip.
    expect(screen.getByText("Apple")).toBeTruthy()
    expect(screen.getByText("Banana")).toBeTruthy()
    // Each chip carries an aria-labelled remove button.
    expect(screen.getByLabelText("remove Apple")).toBeTruthy()
    expect(screen.getByLabelText("remove Banana")).toBeTruthy()
    // Exactly two remove buttons (one per chip).
    const removeButtons = screen
      .getAllByRole("button")
      .filter((el) => el.getAttribute("aria-label")?.startsWith("remove"))
    expect(removeButtons).toHaveLength(2)
  })

  it("clicking a chip's × calls onValueChange with that value removed", () => {
    const onValueChange = vi.fn()
    render(
      <Combobox
        multiple
        options={OPTIONS}
        value={["a", "b"]}
        onValueChange={onValueChange}
      />,
    )
    fireEvent.click(screen.getByLabelText("remove Apple"))
    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(onValueChange).toHaveBeenCalledWith(["b"])
  })

  it("shows the placeholder when nothing is selected", () => {
    render(
      <Combobox
        multiple
        options={OPTIONS}
        value={[]}
        placeholder="Pick fruits"
        onValueChange={() => {}}
      />,
    )
    expect(screen.getByText("Pick fruits")).toBeTruthy()
    // No remove buttons when empty.
    const removeButtons = screen
      .queryAllByRole("button")
      .filter((el) => el.getAttribute("aria-label")?.startsWith("remove"))
    expect(removeButtons).toHaveLength(0)
  })

  it("caps chips at maxChips and shows a +N overflow pill", () => {
    render(
      <Combobox
        multiple
        maxChips={2}
        options={OPTIONS}
        value={["a", "b", "c", "d"]}
        onValueChange={() => {}}
      />,
    )
    // Only the first two chips render.
    expect(screen.getByText("Apple")).toBeTruthy()
    expect(screen.getByText("Banana")).toBeTruthy()
    expect(screen.queryByText("Cherry")).toBeNull()
    expect(screen.queryByText("Durian")).toBeNull()
    // Trailing overflow count pill.
    expect(screen.getByText("+2")).toBeTruthy()
    // Overflow pill is not removable — only the two visible chips have remove buttons.
    const removeButtons = screen
      .getAllByRole("button")
      .filter((el) => el.getAttribute("aria-label")?.startsWith("remove"))
    expect(removeButtons).toHaveLength(2)
  })

  it("keeps the fixed control height in single-select mode", () => {
    const { container } = render(
      <Combobox options={OPTIONS} value="a" onValueChange={() => {}} />,
    )
    const trigger = container.querySelector('[data-slot="combobox-trigger"]')
    expect(trigger?.className).toContain("data-[size=md]:h-control-md")
    expect(trigger?.className).not.toContain("min-h-control-md")
  })
})
