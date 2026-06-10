'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
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
  const pathname = usePathname()
  const scrollRootRef = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    scrollRootRef.current?.scrollTo({ top: 0, left: 0 })
  }, [pathname])

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
        <main
          ref={scrollRootRef}
          data-layout-scroll-root
          className="flex-1 overflow-y-auto bg-surface-1"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
