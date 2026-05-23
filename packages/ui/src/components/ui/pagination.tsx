'use client'

import * as React from 'react'
import { cn } from '../../lib/utils'

export interface PaginationProps {
  page: number
  pageCount: number
  onChange: (page: number) => void
  /** Number of page buttons shown on each side of the current page; @default 1 */
  siblingCount?: number
}

// Page number navigation controls for paginated lists or tables.
// page: current page (1-based). pageCount: total pages. onChange: called with the new page number.
// siblingCount: how many page buttons to show on each side of the current page (default 1).
export const Pagination: React.FC<PaginationProps> = ({ page, pageCount, onChange, siblingCount = 1 }) => {
  const pages = React.useMemo(() => {
    const out: (number | '…')[] = []
    const start = Math.max(2, page - siblingCount)
    const end = Math.min(pageCount - 1, page + siblingCount)
    out.push(1)
    if (start > 2) out.push('…')
    for (let i = start; i <= end; i++) out.push(i)
    if (end < pageCount - 1) out.push('…')
    if (pageCount > 1) out.push(pageCount)
    return out
  }, [page, pageCount, siblingCount])

  const pageBtn = (
    content: React.ReactNode,
    onClick: () => void,
    opts?: { active?: boolean; disabled?: boolean; key?: string | number }
  ) => (
    <button
      key={opts?.key}
      onClick={onClick}
      disabled={opts?.disabled}
      aria-current={opts?.active ? 'page' : undefined}
      className={cn(
        'inline-flex items-center justify-center min-w-7 h-control-sm px-2 rounded-md',
        'border text-sm cursor-pointer',
        'transition-[background-color,border-color,color] duration-fast',
        'focus-visible:outline-none focus-visible:shadow-focus',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        opts?.active
          ? 'bg-surface-2 border-line-default text-content-primary font-medium'
          : 'bg-transparent border-transparent text-content-secondary hover:bg-surface-hover hover:text-content-primary'
      )}
    >
      {content}
    </button>
  )

  return (
    <nav className="inline-flex items-center gap-1" aria-label="Pagination">
      {pageBtn('‹', () => onChange(page - 1), { disabled: page <= 1, key: 'prev' })}
      {pages.map((p, i) =>
        p === '…' ? (
          <span
            key={`e${i}`}
            aria-hidden
            className="inline-flex items-center justify-center min-w-7 h-control-sm px-2 border border-transparent text-sm text-content-secondary select-none"
          >
            …
          </span>
        ) : (
          pageBtn(p, () => onChange(p), { active: p === page, key: p })
        )
      )}
      {pageBtn('›', () => onChange(page + 1), { disabled: page >= pageCount, key: 'next' })}
    </nav>
  )
}


