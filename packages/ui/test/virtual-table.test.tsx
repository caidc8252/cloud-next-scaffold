// @vitest-environment jsdom

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { VirtualTable } from "../src/components/ui/virtual-table";
import type { TableColumn } from "../src/components/ui/table";

interface Row {
  id: number;
  name: string;
}

const columns: TableColumn<Row>[] = [
  { key: "id", title: "ID", field: "id", sortable: true },
  { key: "name", title: "Name", field: "name" },
];

const makeRows = (n: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}` }));

// @tanstack/react-virtual relies on ResizeObserver; jsdom has neither it nor
// IntersectionObserver, so stub both as no-ops for the duration of the suite.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

// virtual-core derives the viewport size from offsetHeight, which jsdom always
// reports as 0 — pin it so the virtualizer renders a real window of rows.
const offsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", NoopObserver);
  vi.stubGlobal("IntersectionObserver", NoopObserver);
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: 500 });
});
afterAll(() => {
  vi.unstubAllGlobals();
  if (offsetHeight) Object.defineProperty(HTMLElement.prototype, "offsetHeight", offsetHeight);
});

describe("<VirtualTable>", () => {
  it("renders only a window of rows, not the whole dataset", () => {
    render(<VirtualTable columns={columns} rows={makeRows(1000)} rowKey={(r) => r.id} />);
    const dataRows = screen.getAllByRole("row").filter((el) => el.querySelector('[role="cell"]'));
    expect(dataRows.length).toBeGreaterThan(0);
    expect(dataRows.length).toBeLessThan(100);
  });

  it("shows the empty node when there are no rows", () => {
    render(
      <VirtualTable
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        empty="Nothing here"
      />,
    );
    expect(screen.getByText("Nothing here")).toBeTruthy();
  });

  it("cycles sort direction through onSortChange", () => {
    const onSortChange = vi.fn();
    render(
      <VirtualTable
        columns={columns}
        rows={makeRows(5)}
        rowKey={(r) => r.id}
        onSortChange={onSortChange}
      />,
    );
    screen.getByRole("button", { name: /ID/ }).click();
    expect(onSortChange).toHaveBeenCalledWith({ key: "id", dir: "asc" });
  });

  it("calls onRowClick with the clicked row", () => {
    const onRowClick = vi.fn();
    render(
      <VirtualTable
        columns={columns}
        rows={makeRows(5)}
        rowKey={(r) => r.id}
        onRowClick={onRowClick}
      />,
    );
    const firstCell = screen.getAllByRole("cell")[0];
    firstCell.closest('[role="row"]')!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onRowClick).toHaveBeenCalledWith({ id: 1, name: "Row 1" }, 0);
  });
});
