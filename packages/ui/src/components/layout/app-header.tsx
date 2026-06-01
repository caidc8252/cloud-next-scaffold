'use client'

import * as React from 'react'
import { Search } from 'lucide-react'
import { cn } from '../../lib/utils'
import {
  Breadcrumb,
  BreadcrumbList,
} from '../ui/breadcrumb'

interface AppHeaderProps {
  /** Leading slot rendered before the breadcrumbs (e.g. a SidebarTrigger). */
  leading?: React.ReactNode
  /** Breadcrumb items as a render slot. Caller renders <BreadcrumbItem>s; this wrapper provides <Breadcrumb><BreadcrumbList>. */
  breadcrumbs?: React.ReactNode
  onSearchClick?: () => void
  /** Notification render slot (e.g. a Popover-anchored bell). Owned entirely by the caller so it can wire badges, popovers, etc. */
  notification?: React.ReactNode
  searchPlaceholder?: string
  className?: string
}

function AppHeader({
  leading,
  breadcrumbs,
  onSearchClick,
  notification,
  searchPlaceholder = 'Search…',
  className,
}: AppHeaderProps) {
  return (
    <div className={cn('flex items-center gap-3 w-full', className)}>
      {leading}
      {breadcrumbs && (
        <Breadcrumb>
          <BreadcrumbList>{breadcrumbs}</BreadcrumbList>
        </Breadcrumb>
      )}

      <div className="flex-1" />

      {onSearchClick !== undefined && (
        <button
          onClick={onSearchClick}
          className="flex items-center gap-2 px-3 h-8 rounded-lg border border-line-default bg-surface-2 text-sm text-content-tertiary hover:bg-surface-hover hover:text-content-primary transition-colors cursor-pointer"
        >
          <Search size={13} />
          <span>{searchPlaceholder}</span>
          <kbd className="ml-1 text-xs font-mono bg-surface-3 px-1.5 py-0.5 rounded border border-line-subtle">
            ⌘K
          </kbd>
        </button>
      )}

      {notification}
    </div>
  )
}

export { AppHeader }
