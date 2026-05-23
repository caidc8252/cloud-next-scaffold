"use client"

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "../../lib/utils"

// Single expandable/collapsible content region; controlled by CollapsibleTrigger.
function Collapsible({ className, ...props }: CollapsiblePrimitive.Root.Props) {
  return (
    <CollapsiblePrimitive.Root
      data-slot="collapsible"
      className={cn("group/collapsible rounded-md border border-line-subtle", className)}
      {...props}
    />
  )
}

function CollapsibleTrigger({
  className,
  children,
  ...props
}: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn(
        "flex w-full items-center justify-between py-3 px-4 text-sm font-medium text-content-primary hover:bg-surface-hover transition-colors outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-inset cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon className="size-3.5 text-content-tertiary shrink-0 pointer-events-none transition-transform duration-[var(--duration-fast)] group-open/collapsible:rotate-180" />
    </CollapsiblePrimitive.Trigger>
  )
}

function CollapsibleContent({
  className,
  ...props
}: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      className={cn(
        "overflow-hidden text-xs text-content-secondary px-4 pb-3 pt-0",
        className
      )}
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }


