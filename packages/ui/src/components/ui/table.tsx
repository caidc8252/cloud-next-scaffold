import * as React from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '../../lib/utils'

export type SortDir = 'asc' | 'desc' | null

export type TableDensity = 'compact' | 'comfortable' | 'spacious'

export interface TableRowState {
  selected?: boolean
  disabled?: boolean
  expanded?: boolean
}

export interface TableColumn<R> {
  key: string
  title: React.ReactNode
  /** render takes priority over field when both are provided */
  render?: (row: R) => React.ReactNode
  /** Simple string access fallback; ignored when render is present */
  field?: keyof R
  sortable?: boolean
  width?: number | string
  align?: 'left' | 'right' | 'center'
}

export interface TableProps<R> {
  columns: TableColumn<R>[]
  rows: R[]
  rowKey: (row: R, index: number) => string | number
  sort?: { key: string; dir: Exclude<SortDir, null> }
  /** Pass null to clear the current sort */
  onSortChange?: (sort: { key: string; dir: Exclude<SortDir, null> } | null) => void
  onRowClick?: (row: R, index: number) => void
  empty?: React.ReactNode
  /** Row height preset (TOMS v2.0): compact for ops/data-dense, spacious for reports. Default comfortable. */
  density?: TableDensity
  /** Zebra striping on even rows */
  striped?: boolean
  /** Outer border + rounded corners + column separators */
  bordered?: boolean
  /** Keep the first column visible during horizontal scroll */
  stickyFirstColumn?: boolean
  /** Per-row visual state: selected (left accent bar), disabled, expanded */
  rowState?: (row: R, index: number) => TableRowState | undefined
  className?: string
}

// TOMS v2.0 density presets — cell vertical padding 6/12/16, header follows.
const CELL_DENSITY: Record<TableDensity, string> = {
  compact: 'px-3 py-1.5',
  comfortable: 'px-4 py-3',
  spacious: 'px-4 py-4',
}
const HEAD_DENSITY: Record<TableDensity, string> = {
  compact: 'px-3 py-2',
  comfortable: 'px-4 py-3',
  spacious: 'px-4 py-4',
}

// Generic typed data table driven by a columns config — no manual thead/tbody markup needed.
// columns: {key, title, render?(row)=>ReactNode, field?, sortable?, width?, align?}[]
// rowKey: (row, index) => string|number — required for React deduplication.
// sort + onSortChange: controlled sort state {key, dir}; pass null to clear.
// onRowClick: makes rows cursor-pointer and calls handler with (row, index).
// empty: custom node shown when rows is empty (defaults to "No data").
// density/striped/bordered/stickyFirstColumn/rowState: TOMS v2.0 table variants.
export function Table<R>({
  columns,
  rows,
  rowKey,
  sort,
  onSortChange,
  onRowClick,
  empty = 'No data',
  density = 'comfortable',
  striped,
  bordered,
  stickyFirstColumn,
  rowState,
  className,
}: TableProps<R>) {
  const handleSort = (col: TableColumn<R>) => {
    if (!col.sortable || !onSortChange) return
    if (!sort || sort.key !== col.key) onSortChange({ key: col.key, dir: 'asc' })
    else if (sort.dir === 'asc') onSortChange({ key: col.key, dir: 'desc' })
    else onSortChange({ key: col.key, dir: 'asc' })
  }

  // Sticky cells need an opaque background so scrolled content doesn't bleed through.
  const stickyCell = (index: number, head: boolean) =>
    stickyFirstColumn && index === 0
      ? cn('sticky left-0 z-1 shadow-sticky-col', head ? 'bg-surface-3' : 'bg-surface-2')
      : undefined

  const separator = bordered ? 'border-r border-line-subtle last:border-r-0' : undefined

  return (
    <div
      className={cn(
        'w-full overflow-auto',
        bordered && 'border border-line-default rounded-lg',
        className,
      )}
    >
      <table className="w-full text-md border-collapse">
        <thead className="bg-surface-3 sticky top-0 z-10">
          <tr>
            {columns.map((col, colIndex) => (
              <th
                key={col.key}
                style={{ width: col.width, textAlign: col.align ?? 'left' }}
                className={cn(
                  HEAD_DENSITY[density],
                  'text-md font-medium text-content-tertiary uppercase tracking-wide border-b border-line-default',
                  separator,
                  stickyCell(colIndex, true),
                )}
              >
                {col.sortable ? (
                  <button
                    onClick={() => handleSort(col)}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-content-primary focus-visible:outline-none"
                  >
                    {col.title}
                    {sort?.key === col.key
                      ? sort.dir === 'asc'
                        ? <ChevronUp className="size-4" />
                        : <ChevronDown className="size-4" />
                      : <ChevronsUpDown className="size-4 opacity-30" />
                    }
                  </button>
                ) : col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-content-tertiary">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => {
              const state = rowState?.(row, i)
              return (
                <tr
                  key={rowKey(row, i)}
                  onClick={onRowClick && !state?.disabled ? () => onRowClick(row, i) : undefined}
                  aria-selected={state?.selected || undefined}
                  data-disabled={state?.disabled || undefined}
                  data-expanded={state?.expanded || undefined}
                  className={cn(
                    'border-b border-line-subtle hover:bg-surface-hover/40 dark:hover:bg-surface-3 transition-colors duration-fast',
                    striped && 'even:bg-surface-3 even:hover:bg-surface-hover/60',
                    // TOMS v2.0 row states: selected = tinted bg + 2px primary left bar,
                    // expanded = surface-3, disabled = dimmed + inert.
                    'aria-selected:bg-state-selected aria-selected:hover:bg-state-selected aria-selected:shadow-row-selected',
                    'data-expanded:bg-surface-3',
                    'data-disabled:opacity-50 data-disabled:pointer-events-none',
                    onRowClick && !state?.disabled && 'cursor-pointer',
                  )}
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={col.key}
                      style={{ textAlign: col.align ?? 'left' }}
                      className={cn(
                        CELL_DENSITY[density],
                        'text-content-primary',
                        separator,
                        stickyCell(colIndex, false),
                      )}
                    >
                      {col.render ? col.render(row) : col.field != null ? String(row[col.field] ?? '') : null}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
