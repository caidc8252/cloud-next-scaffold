'use client'

import * as React from 'react'

import { useTranslations } from '@cloud/i18n/client'
import { cn } from '../../../lib/utils'
import { Pagination } from './pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../primitives/select'

export interface RichPaginationProps {
  /** Current page (1-based). */
  page: number
  /** Total number of pages. */
  pageCount: number
  /** Called with the new page when the user navigates. */
  onPageChange: (page: number) => void
  /** Total item count across all pages, used for the range summary. */
  total: number
  /** Current rows-per-page value (drives the range summary). */
  pageSize: number
  /**
   * Called with the new rows-per-page value. Omit to hide the rows-per-page
   * selector entirely (e.g. lists with a fixed page size).
   */
  onPageSizeChange?: (pageSize: number) => void
  /** Selectable rows-per-page options; @default [10, 25, 50, 100]. */
  pageSizeOptions?: readonly number[]
  /** Page buttons shown on each side of the current page; forwarded to Pagination. */
  siblingCount?: number
  /** Show first/last jump buttons (« / ») flanking prev/next; forwarded to Pagination. @default false */
  showFirstLast?: boolean
  className?: string
}

// Compact prev/next button — mirrors Pagination's inactive page button.
const COMPACT_BTN =
  'inline-flex items-center justify-center min-w-7 h-control-md px-2 rounded-md border border-transparent text-md text-content-secondary cursor-pointer transition-[background-color,border-color,color] duration-fast hover:bg-surface-hover hover:text-content-primary focus-visible:outline-none focus-visible:shadow-focus disabled:opacity-40 disabled:cursor-not-allowed'

// Full list/table footer bar: optional rows-per-page selector + "showing X–Y of Z"
// range summary on the left, page-number navigation on the right. All text is
// localized internally via the `ui.pagination` namespace (same convention as
// DatePicker's `ui.datePicker`), so callers pass only data. Defaults ship in
// @cloud/ui/messages and host apps merge them into their request config.
//
// Responsive (no prop): the bar is its own `@container`, so when its OWN width
// drops below @lg it collapses the rows-per-page select + numbered pager into a
// compact "‹ Page X of Y ›" cluster — handles narrow cards / split panes / mobile
// without the caller doing anything.
export const RichPagination: React.FC<RichPaginationProps> = ({
  page,
  pageCount,
  onPageChange,
  total,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  siblingCount,
  showFirstLast = false,
  className,
}) => {
  const t = useTranslations('ui.pagination')
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div
      data-slot="rich-pagination"
      className={cn(
        '@container flex flex-wrap items-center justify-between gap-3 border-t border-line-subtle px-4 py-3',
        className
      )}
    >
      <div className="flex items-center gap-3 text-xs text-content-secondary">
        {onPageSizeChange ? (
          <div className="@max-lg:hidden flex items-center gap-1.5">
            <span>{t('rowsPerPage')}</span>
            <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
              <SelectTrigger size="sm" className="w-20" aria-label={t('rowsPerPage')}>
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
        ) : null}
        <span className="tabular-nums">
          {t.rich('showing', {
            from,
            to,
            total,
            b: (chunks) => <strong className="font-semibold text-content-primary">{chunks}</strong>,
          })}
        </span>
      </div>
      {/* Full numbered pager — hidden once the bar's own width drops below @lg */}
      <div className="@max-lg:hidden">
        <Pagination
          page={page}
          pageCount={pageCount}
          onChange={onPageChange}
          siblingCount={siblingCount}
          showFirstLast={showFirstLast}
          firstLabel={t('first')}
          prevLabel={t('prev')}
          nextLabel={t('next')}
          lastLabel={t('last')}
        />
      </div>
      {/* Compact pager — shown only when the bar is narrow: prev/next + "Page X of Y" */}
      <div className="hidden @max-lg:flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label={t('prev')}
          className={COMPACT_BTN}
        >
          ‹
        </button>
        <span className="px-1 font-mono text-md tabular-nums text-content-secondary">
          {t('pageOf', { page, total: pageCount })}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label={t('next')}
          className={COMPACT_BTN}
        >
          ›
        </button>
      </div>
    </div>
  )
}
