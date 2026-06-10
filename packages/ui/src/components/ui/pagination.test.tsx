// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"

import { Pagination } from "./pagination"

afterEach(cleanup)

describe("Pagination — showFirstLast", () => {
  it("omits first/last buttons by default", () => {
    render(<Pagination page={3} pageCount={10} onChange={() => {}} />)
    expect(screen.queryByLabelText("First page")).toBeNull()
    expect(screen.queryByLabelText("Last page")).toBeNull()
  })

  it("renders first/last buttons when enabled", () => {
    render(<Pagination page={3} pageCount={10} onChange={() => {}} showFirstLast />)
    expect(screen.getByLabelText("First page")).toBeTruthy()
    expect(screen.getByLabelText("Last page")).toBeTruthy()
  })

  it("jumps to page 1 / pageCount via first/last", () => {
    const onChange = vi.fn()
    render(<Pagination page={5} pageCount={10} onChange={onChange} showFirstLast />)
    fireEvent.click(screen.getByLabelText("First page"))
    fireEvent.click(screen.getByLabelText("Last page"))
    expect(onChange).toHaveBeenNthCalledWith(1, 1)
    expect(onChange).toHaveBeenNthCalledWith(2, 10)
  })

  it("disables first/prev on the first page and last/next on the last page", () => {
    const { rerender } = render(
      <Pagination page={1} pageCount={10} onChange={() => {}} showFirstLast />,
    )
    expect(screen.getByLabelText("First page")).toHaveProperty("disabled", true)
    expect(screen.getByLabelText("Previous page")).toHaveProperty("disabled", true)
    expect(screen.getByLabelText("Next page")).toHaveProperty("disabled", false)

    rerender(<Pagination page={10} pageCount={10} onChange={() => {}} showFirstLast />)
    expect(screen.getByLabelText("Last page")).toHaveProperty("disabled", true)
    expect(screen.getByLabelText("Next page")).toHaveProperty("disabled", true)
    expect(screen.getByLabelText("Previous page")).toHaveProperty("disabled", false)
  })

  it("honors custom aria labels", () => {
    render(
      <Pagination
        page={2}
        pageCount={5}
        onChange={() => {}}
        showFirstLast
        firstLabel="首页"
        lastLabel="末页"
      />,
    )
    expect(screen.getByLabelText("首页")).toBeTruthy()
    expect(screen.getByLabelText("末页")).toBeTruthy()
  })
})
