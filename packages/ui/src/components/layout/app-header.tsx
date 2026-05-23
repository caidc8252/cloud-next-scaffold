'use client'

import * as React from 'react'
import { Search, Bell } from 'lucide-react'
import { cn } from '../../lib/utils'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/breadcrumb'

export interface BreadcrumbItemDef {
  label: string
  href?: string
}

interface AppHeaderProps {
  breadcrumbs?: BreadcrumbItemDef[]
  onSearchClick?: () => void
  onNotificationClick?: () => void
  searchPlaceholder?: string
  className?: string
}

// Top application bar with breadcrumb trail (left) and search/notification actions (right).
// breadcrumbs: {label, href?}[] — items without href render as the current page (plain text, no link).
// onSearchClick: shows a ⌘K search button when provided; omit to hide.
// onNotificationClick: bell icon button; always rendered but click handler is optional.
function AppHeader({
  breadcrumbs,
  onSearchClick,
  onNotificationClick,
  searchPlaceholder = 'Search…',
  className,
}: AppHeaderProps) {
  return (
    <div className={cn('flex items-center gap-3 w-full', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {crumb.href ? (
                    <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
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

      <button
        onClick={onNotificationClick}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-content-secondary hover:bg-surface-hover hover:text-content-primary transition-colors cursor-pointer"
      >
        <Bell size={15} />
      </button>
    </div>
  )
}

export { AppHeader }


