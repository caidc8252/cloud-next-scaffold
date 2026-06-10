// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"

import { LoadMore } from "./load-more"

afterEach(cleanup)

describe("LoadMore", () => {
  it("renders the button label and fires onLoadMore on click", () => {
    const onLoadMore = vi.fn()
    render(<LoadMore onLoadMore={onLoadMore}>Load 25 more</LoadMore>)
    const btn = screen.getByRole("button", { name: "Load 25 more" })
    fireEvent.click(btn)
    expect(onLoadMore).toHaveBeenCalledOnce()
  })

  it("disables the button while loading", () => {
    render(
      <LoadMore loading onLoadMore={() => {}}>
        Load 25 more
      </LoadMore>,
    )
    expect(screen.getByRole("button")).toHaveProperty("disabled", true)
  })

  it("swaps the button for endContent when done", () => {
    render(
      <LoadMore done endContent="You've reached the end" onLoadMore={() => {}}>
        Load 25 more
      </LoadMore>,
    )
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.getByText("You've reached the end")).toBeTruthy()
  })

  it("renders the summary line when provided", () => {
    render(
      <LoadMore summary="Showing 25 of 1,284" onLoadMore={() => {}}>
        Load more
      </LoadMore>,
    )
    expect(screen.getByText("Showing 25 of 1,284")).toBeTruthy()
  })
})
