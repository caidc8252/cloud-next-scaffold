'use client'

import * as React from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cn } from '../../lib/utils'
import { useInfiniteScroll } from '../../lib/use-infinite-scroll'
import { Spinner } from './spinner'
import type { TableColumn, SortDir } from './table'

export interface VirtualTableProps<R> {
  columns: TableColumn<R>[]
  rows: R[]
  rowKey: (row: R, index: number) => string | number
  /** Estimated row height in px, used before real rows are measured. @default 44 */
  estimateRowHeight?: number
  /** Scroll viewport height; required for windowing to kick in. @default 480 */
  height?: number | string
  /** Extra rows rendered beyond the visible window. @default 8 */
  overscan?: number
  sort?: { key: string; dir: Exclude<SortDir, null> }
  /** Pass null to clear the current sort */
  onSortChange?: (sort: { key: string; dir: Exclude<SortDir, null> } | null) => void
  onRowClick?: (row: R, index: number) => void
  empty?: React.ReactNode
  className?: string
  /** Whether more pages exist; enables scroll loading when paired with onReachEnd. */
  hasMore?: boolean
  /** Whether the next page is currently loading. */
  isLoadingMore?: boolean
  /** Called when the viewport nears the bottom and hasMore is true. */
  onReachEnd?: () => void
  /** Footer shown while loading the next page. Defaults to a centered spinner. */
  loadingFooter?: React.ReactNode
}

// Windowed data table that shares the columns/sort/rowKey contract with <Table>.
// It bundles two independent features — turn on whichever you need:
//
// ── Feature 1: Virtual scrolling (always on) ─────────────────────────────────
// Only the rows inside the scroll viewport are mounted (via @tanstack/react-virtual),
// so a 10k-row array stays smooth. Just give it a fixed-height viewport; that's it.
//   <VirtualTable
//     columns={columns}
//     rows={rows}                 // the full array — pass all of it, even 10k+
//     rowKey={(row) => row.id}
//     height={520}                // REQUIRED for windowing: the scroll viewport height
//     estimateRowHeight={44}      // optional: guess before rows are measured
//   />
// Tuning: estimateRowHeight ≈ your real row height (variable heights auto-measure),
// overscan = how many extra rows to render above/below the viewport (default 8).
//
// ── Feature 2: Scroll loading / infinite scroll (opt-in) ─────────────────────
// To append the next page as the user nears the bottom, pass all three of
// hasMore + isLoadingMore + onReachEnd. onReachEnd fires once when the bottom
// sentinel scrolls into view (and again after you grow `rows`), guarded so it
// won't re-fire while a load is in flight. Omit onReachEnd to disable this.
//   const [rows, setRows] = useState<Row[]>(firstPage)
//   const [isLoadingMore, setIsLoadingMore] = useState(false)
//   const hasMore = rows.length < total
//   async function loadNextPage() {
//     setIsLoadingMore(true)
//     const next = await request.get<Row[]>('/api/things', { query: { page, limit } })
//     setRows((prev) => [...prev, ...next.data])
//     setIsLoadingMore(false)
//   }
//   <VirtualTable
//     columns={columns} rows={rows} rowKey={(r) => r.id} height={520}
//     hasMore={hasMore}            // false → stop firing onReachEnd
//     isLoadingMore={isLoadingMore} // true → shows loadingFooter, blocks re-fire
//     onReachEnd={loadNextPage}    // presence of this enables scroll loading
//     loadingFooter={<Spinner />}  // optional; defaults to a centered <Spinner/>
//   />
// Need scroll loading on a non-table list instead? Use the standalone
// useInfiniteScroll hook directly (see src/lib/use-infinite-scroll.ts).
export function VirtualTable<R>({
  columns,
  rows,
  rowKey,
  estimateRowHeight = 44,
  height = 480,
  overscan = 8,
  sort,
  onSortChange,
  onRowClick,
  empty = 'No data',
  className,
  hasMore = false,
  isLoadingMore = false,
  onReachEnd,
  loadingFooter,
}: VirtualTableProps<R>) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null)
  const scrollEnabled = Boolean(onReachEnd)

  const gridTemplate = React.useMemo(
    () =>
      columns
        .map((col) => (col.width == null ? 'minmax(0, 1fr)' : typeof col.width === 'number' ? `${col.width}px` : col.width))
        .join(' '),
    [columns],
  )

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual returns non-memoizable functions by design
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateRowHeight,
    overscan,
  })

  const { sentinelRef } = useInfiniteScroll({
    hasMore,
    isLoading: isLoadingMore,
    onLoadMore: onReachEnd ?? (() => {}),
    root: scrollRef,
  })

  const handleSort = (col: TableColumn<R>) => {
    if (!col.sortable || !onSortChange) return
    if (!sort || sort.key !== col.key) onSortChange({ key: col.key, dir: 'asc' })
    else if (sort.dir === 'asc') onSortChange({ key: col.key, dir: 'desc' })
    else onSortChange({ key: col.key, dir: 'asc' })
  }

  const items = virtualizer.getVirtualItems()

  return (
    <div
      ref={scrollRef}
      className={cn('w-full overflow-auto', className)}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      <div className="text-md min-w-full">
        {/* Header */}
        <div
          role="row"
          className="bg-surface-3 sticky top-0 z-10 grid border-b border-line-default"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {columns.map((col) => (
            <div
              key={col.key}
              role="columnheader"
              style={{ textAlign: col.align ?? 'left' }}
              className="px-4 py-3 text-md font-medium text-content-tertiary uppercase tracking-wide"
            >
              {col.sortable ? (
                <button
                  onClick={() => handleSort(col)}
                  className="inline-flex items-center gap-1 cursor-pointer hover:text-content-primary focus-visible:outline-none"
                >
                  {col.title}
                  {sort?.key === col.key ? (
                    sort.dir === 'asc' ? (
                      <ChevronUp className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )
                  ) : (
                    <ChevronsUpDown className="size-4 opacity-30" />
                  )}
                </button>
              ) : (
                col.title
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-content-tertiary">{empty}</div>
        ) : (
          <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
            {items.map((item) => {
              const row = rows[item.index]
              return (
                <div
                  key={rowKey(row, item.index)}
                  role="row"
                  ref={virtualizer.measureElement}
                  data-index={item.index}
                  onClick={onRowClick ? () => onRowClick(row, item.index) : undefined}
                  className={cn(
                    'grid border-b border-line-subtle hover:bg-surface-hover/40 dark:hover:bg-surface-3 transition-colors duration-fast',
                    onRowClick && 'cursor-pointer',
                  )}
                  style={{
                    gridTemplateColumns: gridTemplate,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${item.start}px)`,
                  }}
                >
                  {columns.map((col) => (
                    <div
                      key={col.key}
                      role="cell"
                      style={{ textAlign: col.align ?? 'left' }}
                      className="px-4 py-3 text-content-primary"
                    >
                      {col.render ? col.render(row) : col.field != null ? String(row[col.field] ?? '') : null}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {/* Scroll-loading sentinel + footer */}
        {scrollEnabled && (
          <div ref={sentinelRef} className="flex items-center justify-center py-3">
            {isLoadingMore ? (loadingFooter ?? <Spinner />) : null}
          </div>
        )}
      </div>
    </div>
  )
}
