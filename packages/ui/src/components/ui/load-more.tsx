'use client'

import * as React from 'react'
import { cn } from '../../lib/utils'
import { Button } from './button'
import { Progress } from './progress'

export interface LoadMoreProps {
  /** Whether the next batch is currently loading; disables the button + shows its spinner. */
  loading?: boolean
  /** Whether everything is loaded; swaps the button for endContent. */
  done?: boolean
  /** Called when the load-more button is pressed. */
  onLoadMore: () => void
  /** Completion ratio 0–1; when provided renders a thin progress bar under the control. */
  progress?: number
  /** Optional line above the control, e.g. a localized "Showing N of TOTAL". */
  summary?: React.ReactNode
  /** Shown in place of the button once done, e.g. a localized "You've reached the end". */
  endContent?: React.ReactNode
  /** Button label (also stays visible while loading). */
  children: React.ReactNode
  className?: string
}

// Append-on-click pagination footer: an optional summary line, a load-more button
// (or an end marker once `done`), and an optional progress bar. Purely presentational
// — all copy is passed in, so it stays i18n-agnostic. Pair it with a windowed/plain
// table above. For scroll-driven loading instead, use <VirtualTable> with onReachEnd.
export function LoadMore({
  loading = false,
  done = false,
  onLoadMore,
  progress,
  summary,
  endContent,
  children,
  className,
}: LoadMoreProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 border-t border-line-default px-4 py-5',
        className,
      )}
    >
      {summary != null && (
        <div className="text-sm text-content-secondary">{summary}</div>
      )}
      {done ? (
        <div className="text-sm text-content-tertiary">{endContent}</div>
      ) : (
        <Button variant="secondary" size="lg" loading={loading} onClick={onLoadMore}>
          {children}
        </Button>
      )}
      {progress != null && (
        <Progress
          value={Math.max(0, Math.min(100, progress * 100))}
          className="w-60 max-w-full"
          aria-label="Loaded so far"
        />
      )}
    </div>
  )
}
