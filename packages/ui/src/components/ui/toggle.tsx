"use client"

import * as React from "react"
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const toggleVariants = cva(
  // Base — matches button.tsx interaction tokens. Inside <ToggleGroup> (data-slot="toggle-group"),
  // edges flatten so items share a single outer border.
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-line-strong bg-surface-2 font-medium whitespace-nowrap transition-colors outline-none cursor-pointer select-none focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50 data-pressed:bg-surface-active hover:bg-surface-hover [&_svg]:pointer-events-none [&_svg]:shrink-0 in-data-[slot=toggle-group]:rounded-none in-data-[slot=toggle-group]:border-0 in-data-[slot=toggle-group]:border-r in-data-[slot=toggle-group]:border-line-strong in-data-[slot=toggle-group]:last:border-r-0",
  {
    variants: {
      variant: {
        default: "bg-surface-2",
        outline: "bg-transparent",
      },
      size: {
        sm: "h-control-sm px-cx-sm text-xs",
        md: "h-control-md px-cx-md text-sm",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
)

interface ToggleProps
  extends Omit<TogglePrimitive.Props<string>, "render">,
    VariantProps<typeof toggleVariants> {}

// Press-toggle button with on/off state. Used standalone or as a child of <ToggleGroup>.
// pressed/defaultPressed/onPressedChange follow the base-ui Toggle contract.
function Toggle({
  className,
  variant,
  size,
  ...props
}: ToggleProps) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Toggle, toggleVariants, type ToggleProps }
