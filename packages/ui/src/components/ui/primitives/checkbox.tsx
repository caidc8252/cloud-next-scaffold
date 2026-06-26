"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"

import { cn } from "../../../lib/utils"
import { CheckIcon, MinusIcon } from "lucide-react"

// Binary on/off form input. Prefer ToggleCheckbox (toggles.tsx) for fields that need an inline label.
// Pass base-ui's `indeterminate` prop for tri-state ("select all" headers): the box fills
// primary and shows a minus dash instead of the check.
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-4 shrink-0 items-center justify-center rounded-sm border border-line-strong bg-surface-2 transition-colors outline-none cursor-pointer group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground dark:data-indeterminate:bg-primary",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-2.5"
      >
        {/* base-ui renders the indicator for checked OR indeterminate; the root's
            data-indeterminate attribute picks which glyph shows. */}
        <CheckIcon className="in-data-indeterminate:hidden" />
        <MinusIcon className="hidden in-data-indeterminate:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }


