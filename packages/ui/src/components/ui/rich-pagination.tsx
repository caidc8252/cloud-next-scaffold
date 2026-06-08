'use client'

import * as React from 'react'

import { useTranslations } from '@cloud/i18n/client'
import { cn } from '../../lib/utils'
import { Pagination } from './pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'

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

// Full list/table footer bar: optional rows-per-page selector + "showing X–Y of Z"
// range summary on the left, page-number navigation on the right. All text is
// localized internally via the `ui.pagination` namespace (same convention as
// DatePicker's `ui.datePicker`), so callers pass only data — no label props.
// Consuming apps must provide `ui.pagination.*` messages.
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
        'flex flex-wrap items-center justify-between gap-3 border-t border-line-subtle px-4 py-3',
        className
      )}
    >
      <div className="flex items-center gap-3 text-xs text-content-secondary">
        {onPageSizeChange ? (
          <div className="flex items-center gap-1.5">
            <span>{t('rowsPerPage')}</span>
            <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
              <SelectTrigger size="sm" className="w-[72px]" aria-label={t('rowsPerPage')}>
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
  )
}
