// @vitest-environment jsdom
import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

import { Table, type TableColumn } from "./table"

interface Row {
  id: number
  name: string
}

const COLUMNS: TableColumn<Row>[] = [
  { key: "id", title: "ID", field: "id" },
  { key: "name", title: "Name", field: "name" },
]
const ROWS: Row[] = [
  { id: 1, name: "alpha" },
  { id: 2, name: "beta" },
]

const rowOf = (text: string) => screen.getByText(text).closest("tr")

describe("Table — TOMS v2.0 variants", () => {
  it("defaults to comfortable density (py-3) and switches to compact/spacious", () => {
    const { rerender } = render(<Table columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} />)
    expect(screen.getByText("alpha").closest("td")?.className).toContain("py-3")

    rerender(<Table columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} density="compact" />)
    expect(screen.getByText("alpha").closest("td")?.className).toContain("py-1.5")

    rerender(<Table columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} density="spacious" />)
    expect(screen.getByText("alpha").closest("td")?.className).toContain("py-4")
  })

  it("striped adds even-row zebra classes", () => {
    render(<Table columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} striped />)
    expect(rowOf("alpha")?.className).toContain("even:bg-surface-3")
  })

  it("bordered wraps with border + radius and separates columns", () => {
    const { container } = render(
      <Table columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} bordered />,
    )
    expect(container.firstElementChild?.className).toContain("rounded-xl")
    expect(container.firstElementChild?.className).toContain("shadow-1")
    expect(screen.getByText("alpha").closest("td")?.className).toContain("border-r")
  })

  it("header uses the TOMS overline weight and tracking", () => {
    render(<Table columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} />)
    const header = screen.getByText("Name").closest("th")
    expect(header?.className).toContain("font-semibold")
    expect(header?.className).toContain("tracking-overline")
  })

  it("rowState drives aria-selected / data-disabled / data-expanded", () => {
    render(
      <Table
        columns={COLUMNS}
        rows={ROWS}
        rowKey={(r) => r.id}
        rowState={(r) =>
          r.id === 1 ? { selected: true } : { disabled: true, expanded: true }
        }
      />,
    )
    expect(rowOf("alpha")?.getAttribute("aria-selected")).toBe("true")
    expect(rowOf("beta")?.getAttribute("data-disabled")).toBe("true")
    expect(rowOf("beta")?.getAttribute("data-expanded")).toBe("true")
  })

  it("disabled rows do not receive the row click handler", () => {
    let clicked = 0
    render(
      <Table
        columns={COLUMNS}
        rows={ROWS}
        rowKey={(r) => r.id}
        onRowClick={() => {
          clicked += 1
        }}
        rowState={(r) => (r.id === 2 ? { disabled: true } : undefined)}
      />,
    )
    rowOf("alpha")?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    rowOf("beta")?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    expect(clicked).toBe(1)
  })

  it("sort header cycles unsorted -> asc -> desc -> unsorted", () => {
    const calls: Array<{ key: string; dir: "asc" | "desc" } | null> = []
    const sortable: TableColumn<Row>[] = [{ key: "name", title: "Name", field: "name", sortable: true }]
    const { rerender } = render(
      <Table columns={sortable} rows={ROWS} rowKey={(r) => r.id} onSortChange={(s) => calls.push(s)} />,
    )
    const header = () => screen.getByRole("button", { name: "Name" })

    header().click()
    expect(calls.at(-1)).toEqual({ key: "name", dir: "asc" })

    rerender(
      <Table
        columns={sortable}
        rows={ROWS}
        rowKey={(r) => r.id}
        sort={{ key: "name", dir: "asc" }}
        onSortChange={(s) => calls.push(s)}
      />,
    )
    header().click()
    expect(calls.at(-1)).toEqual({ key: "name", dir: "desc" })

    rerender(
      <Table
        columns={sortable}
        rows={ROWS}
        rowKey={(r) => r.id}
        sort={{ key: "name", dir: "desc" }}
        onSortChange={(s) => calls.push(s)}
      />,
    )
    header().click()
    expect(calls.at(-1)).toBeNull()
  })

  it("stickyFirstColumn pins only the first column cells", () => {
    render(<Table columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} stickyFirstColumn />)
    const cells = rowOf("alpha")?.querySelectorAll("td")
    expect(cells?.[0]?.className).toContain("sticky")
    expect(cells?.[1]?.className).not.toContain("sticky")
  })
})
