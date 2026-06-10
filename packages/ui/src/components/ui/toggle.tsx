"use client"

import * as React from "react"
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const toggleVariants = cva(
  // Base — matches button.tsx interaction tokens. Group-aware styling keys off the
  // parent <ToggleGroup>'s `data-variant` (see toggle-group.tsx), so an item restyles
  // purely from its position in the tree, with no prop threading.
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-line-strong bg-surface-2 font-medium whitespace-nowrap transition-colors outline-none cursor-pointer select-none focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50 data-pressed:bg-surface-active hover:bg-surface-hover [&_svg]:pointer-events-none [&_svg]:shrink-0 " +
    // Inside an "outline" group: flatten edges so items share one outer border.
    "in-data-[variant=outline]:rounded-none in-data-[variant=outline]:border-0 in-data-[variant=outline]:border-r in-data-[variant=outline]:border-line-strong in-data-[variant=outline]:last:border-r-0 " +
    // Inside a "segmented" group (TOMS .tds-btn-group): borderless transparent item on a
    // tinted track; the pressed item lifts into a pill (bg-surface-2 + shadow-1). These
    // stacked in-data-[variant=segmented]:… variants override the base bg/border/hover/
    // pressed above; the active look matches TOMS (bg-2 + shadow-1 + primary text).
    "in-data-[variant=segmented]:rounded in-data-[variant=segmented]:border-0 in-data-[variant=segmented]:bg-transparent in-data-[variant=segmented]:text-content-secondary in-data-[variant=segmented]:hover:bg-transparent in-data-[variant=segmented]:hover:text-content-primary in-data-[variant=segmented]:data-pressed:bg-surface-2 in-data-[variant=segmented]:data-pressed:text-content-primary in-data-[variant=segmented]:data-pressed:shadow-1 " +
    // Inside a "cloud" group: a standalone rounded-full bordered chip (no shared
    // track). Compact (h-auto + py-1), tints primary when pressed. Overrides the
    // base height/radius/border/colors so size variant + base don't fight it.
    "in-data-[variant=cloud]:h-auto in-data-[variant=cloud]:rounded-full in-data-[variant=cloud]:border in-data-[variant=cloud]:border-line-default in-data-[variant=cloud]:bg-surface-2 in-data-[variant=cloud]:px-2.5 in-data-[variant=cloud]:py-1 in-data-[variant=cloud]:text-xs in-data-[variant=cloud]:font-normal in-data-[variant=cloud]:text-content-secondary in-data-[variant=cloud]:hover:bg-surface-2 in-data-[variant=cloud]:hover:border-line-strong in-data-[variant=cloud]:data-pressed:border-primary-500 in-data-[variant=cloud]:data-pressed:bg-primary-50 in-data-[variant=cloud]:data-pressed:font-medium in-data-[variant=cloud]:data-pressed:text-primary-700",
  {
    variants: {
      variant: {
        default: "bg-surface-2",
        outline: "bg-transparent",
      },
      size: {
        // Fixed-height control sizes. Use size="auto" for content-driven
        // toggles; className="h-auto" does not dedupe custom h-control-*.
        sm: "h-control-sm px-cx-sm text-xs",
        md: "h-control-md px-cx-md text-sm",
        auto: "gap-1.5 px-cx-md py-2 text-sm",
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
// size: sm/md are fixed-height controls; auto is content-driven for option cards.
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
