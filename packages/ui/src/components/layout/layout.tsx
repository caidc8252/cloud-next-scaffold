'use client'

import * as React from 'react'
import { cn } from '../../lib/utils'
import { useSidebar } from '../../lib/sidebar'
import { Sheet, SheetContent, SheetTitle } from '../ui/sheet'

const SIDEBAR_WIDTH = 248
const SIDEBAR_WIDTH_COLLAPSED = 56

// Full-page shell: fixed-height viewport with an optional sidebar and a sticky header (h-14).
// The desktop aside width follows useSidebar().collapsed (inline style → SSR-correct, no flash);
// on mobile the aside is hidden (CSS) and the same sidebar renders inside a left Sheet drawer.
// The scroll area is full-width and UNPADDED: pages own their padding (so full-bleed bands
// like a white page header can touch the edges without negative-margin tricks).
export const Layout: React.FC<{
  sidebar?: React.ReactNode
  header?: React.ReactNode
  children?: React.ReactNode
  className?: string
}> = ({ sidebar, header, children, className }) => {
  const { collapsed, mobileOpen, setMobileOpen } = useSidebar()

  return (
    <div className={cn('flex h-screen overflow-hidden', className)}>
      {sidebar && (
        <>
          {/* Desktop rail — hidden below md, where the drawer takes over. */}
          <aside
            className="hidden md:flex shrink-0 flex-col bg-surface-3 overflow-y-auto overflow-x-hidden"
            style={{
              width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH,
              transition: 'width 180ms cubic-bezier(.2,.7,.2,1)',
            }}
          >
            {sidebar}
          </aside>
          {/* Mobile drawer — always mounted, opens via the trigger on mobile. */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="left" showCloseButton={false} className="data-[side=left]:w-64 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {sidebar}
            </SheetContent>
          </Sheet>
        </>
      )}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {header && (
          <header className="h-14 shrink-0 flex items-center px-6 bg-surface-2 border-b border-line-subtle sticky top-0 z-sticky">
            {header}
          </header>
        )}
        <main className="flex-1 overflow-y-auto bg-surface-1">
          {children}
        </main>
      </div>
    </div>
  )
}

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
