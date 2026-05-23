import * as React from 'react'
import { cn } from '../../lib/utils'

interface ContentHeaderProps {
  title: string
  description?: string
  className?: string
  children?: React.ReactNode
}

// Page-level title section placed below AppHeader. title is required; description is optional muted subtext.
// children slot renders action buttons flush-right (e.g. a primary CTA next to the title).
function ContentHeader({ title, description, className, children }: ContentHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between mb-3', className)}>
      <div>
        <h1 className="text-3xl font-semibold text-content-primary tracking-[-0.02em]">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-content-secondary mt-1">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2">{children}</div>
      )}
    </div>
  )
}

export { ContentHeader }


