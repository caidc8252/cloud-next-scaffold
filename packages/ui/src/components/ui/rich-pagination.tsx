'use client'

import * as React from 'react'

import { cn } from '../../lib/utils'
import { Pagination, type PaginationProps } from './pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'

export interface RichPaginationRange {
  /** 1-based index of the first item on the current page (0 when total is 0). */
  start: number
  /** 1-based index of the last item on the current page. */
  end: number
  /** Total item count across all pages. */
  total: number
}

export interface RichPaginationProps {
  /** Current page (1-based). */
  page: number
  /** Total number of pages. */
  pageCount: number
  /** Called with the new page when the user navigates. */
  onPageChange: (page: number) => void
  /** Current rows-per-page value. */
  pageSize: number
  /** Total item count across all pages, used for the range summary. */
  total: number
  /** Called with the new rows-per-page value. */
  onPageSizeChange: (pageSize: number) => void
  /** Selectable rows-per-page options; @default [10, 25, 50, 100]. */
  pageSizeOptions?: number[]
  /** Text shown before the rows-per-page select; @default 'Rows per page'. */
  rowsPerPageLabel?: React.ReactNode
  /**
   * Renders the range summary from the computed `{ start, end, total }`.
   * @default `Showing ${start}–${end} of ${total}`
   */
  summary?: (range: RichPaginationRange) => React.ReactNode
  /** Forwarded to the inner page-number Pagination (siblingCount, showFirstLast, aria labels…). */
  paginationProps?: Omit<PaginationProps, 'page' | 'pageCount' | 'onChange'>
  className?: string
}

// Full list/table footer bar: rows-per-page selector + "showing X–Y of Z" range
// summary on the left, page-number navigation on the right. Text is passed via
// props (English defaults) so callers localize it — same convention as Pagination.
export const RichPagination: React.FC<RichPaginationProps> = ({
  page,
  pageCount,
  onPageChange,
  pageSize,
  total,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  rowsPerPageLabel = 'Rows per page',
  summary,
  paginationProps,
  className,
}) => {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div
      data-slot="rich-pagination"
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t border-line-subtle px-4 py-3',
        className
      )}
    >
      <div className="flex items-center gap-3 text-xs text-content-secondary">
        <div className="flex items-center gap-1.5">
          <span>{rowsPerPageLabel}</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger size="sm" className="w-[72px]">
              <SelectValue>{(v: string) => String(v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="tabular-nums">
          {summary
            ? summary({ start, end, total })
            : `Showing ${start}–${end} of ${total}`}
        </span>
      </div>
      <Pagination
        page={page}
        pageCount={pageCount}
        onChange={onPageChange}
        {...paginationProps}
      />
    </div>
  )
}
