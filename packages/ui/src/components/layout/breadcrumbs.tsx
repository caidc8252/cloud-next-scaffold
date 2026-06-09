import * as React from 'react'
import { Fragment } from 'react'
import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/breadcrumb'

export type BreadcrumbsItem = {
  label: React.ReactNode
  href?: string
  render?: React.ComponentProps<typeof BreadcrumbLink>['render']
}

interface BreadcrumbsProps {
  items: BreadcrumbsItem[]
}

// Renders items + separators for the AppHeader.breadcrumbs slot (which already wraps in <Breadcrumb><BreadcrumbList>).
// Need full control (icons, async labels, custom segments)? Compose the breadcrumb primitives directly instead.
function Breadcrumbs({ items }: BreadcrumbsProps) {
  return items.map((item, i) => {
    const isLast = i === items.length - 1
    return (
      <Fragment key={i}>
        {i > 0 && <BreadcrumbSeparator />}
        <BreadcrumbItem>
          {isLast ? (
            <BreadcrumbPage>{item.label}</BreadcrumbPage>
          ) : item.href ? (
            <BreadcrumbLink href={item.href} render={item.render}>
              {item.label}
            </BreadcrumbLink>
          ) : (
            <span>{item.label}</span>
          )}
        </BreadcrumbItem>
      </Fragment>
    )
  })
}

export { Breadcrumbs }
