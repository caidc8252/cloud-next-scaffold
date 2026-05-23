"use client"

import * as React from "react"
import { Separator as SeparatorPrimitive } from "@base-ui/react/separator"
import { cn } from "../../lib/utils"

interface SeparatorProps extends SeparatorPrimitive.Props {
  label?: React.ReactNode
}

// Horizontal or vertical divider line. label (string): renders centered text between two lines.
// Omit label for a plain divider.
function Separator({
  className,
  orientation = "horizontal",
  label,
  ...props
}: SeparatorProps) {
  if (label) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-line-subtle" />
        <span className="text-xs text-content-tertiary shrink-0">{label}</span>
        <div className="h-px flex-1 bg-line-subtle" />
      </div>
    )
  }

  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-line-subtle data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px data-[orientation=vertical]:self-stretch",
        className
      )}
      {...props}
    />
  )
}

export { Separator }


