'use client'

import * as React from 'react'
import { cn } from '../../lib/utils'

// Full-page shell: fixed-height viewport with optional sidebar (w-64) and sticky header (h-14).
// Pass sidebar and header as named slots. Content area is max-w-content centered with px-8 pt-7 pb-16.
export const Layout: React.FC<{
  sidebar?: React.ReactNode
  header?: React.ReactNode
  children?: React.ReactNode
  className?: string
}> = ({ sidebar, header, children, className }) => (
  <div className={cn('flex h-screen overflow-hidden', className)}>
    {sidebar && (
      <aside className="w-64 shrink-0 flex flex-col bg-surface-3 border-r border-line-subtle overflow-y-auto">
        {sidebar}
      </aside>
    )}
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
      {header && (
        <header className="h-14 shrink-0 flex items-center px-6 bg-surface-2 border-b border-line-subtle sticky top-0 z-sticky">
          {header}
        </header>
      )}
      <main className="flex-1 overflow-y-auto bg-surface-1">
        <div className="mx-auto w-full max-w-content px-8 pt-7 pb-16">
          {children}
        </div>
      </main>
    </div>
  </div>
)

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** @default 12 */
  columns?: number
  /** Accepts any CSS length or a design-token var e.g. 'var(--space-4)'; @default 'var(--space-4)' */
  gap?: number | string
}

// CSS grid wrapper. columns defaults to 12; gap accepts any CSS length or design-token var.
export const Grid: React.FC<GridProps> = ({ columns = 12, gap = 'var(--space-4)', style, children, ...rest }) => (
  <div
    style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap, ...style }}
    {...rest}
  >
    {children}
  </div>
)

export interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  span?: number
}

// Grid child. span: number of columns to occupy (default 1). Sets minWidth:0 to prevent overflow.
export const GridItem: React.FC<GridItemProps> = ({ span = 1, style, ...rest }) => (
  <div style={{ gridColumn: `span ${span} / span ${span}`, minWidth: 0, ...style }} {...rest} />
)

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  /** @default 'column' */
  direction?: 'row' | 'column'
  /** Accepts any CSS length or a design-token var e.g. 'var(--space-3)'; @default 'var(--space-3)' */
  gap?: number | string
  align?: React.CSSProperties['alignItems']
  justify?: React.CSSProperties['justifyContent']
  wrap?: boolean
}

// Flex container. direction: 'column'(default)|'row'; gap defaults to var(--space-3). Accepts align, justify, wrap.
export const Stack: React.FC<StackProps> = ({ direction = 'column', gap = 'var(--space-3)', align, justify, wrap, style, ...rest }) => (
  <div
    style={{ display: 'flex', flexDirection: direction, gap, alignItems: align, justifyContent: justify, flexWrap: wrap ? 'wrap' : undefined, ...style }}
    {...rest}
  />
)


