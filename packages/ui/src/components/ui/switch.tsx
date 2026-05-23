"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "../../lib/utils"

// Binary toggle switch. size: 'sm'|'default'. Prefer ToggleSwitch (toggles.tsx) for fields that need an inline label.
function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none cursor-pointer after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:shadow-focus aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 data-[size=default]:h-5 data-[size=default]:w-9 data-[size=sm]:h-3.5 data-[size=sm]:w-6 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-unchecked:bg-line-strong data-checked:bg-primary data-checked:shadow-cta data-checked:hover:bg-primary-600 dark:data-unchecked:bg-input/80 dark:data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full bg-background ring-0 transition-transform shadow-[0_1px_2px_oklch(0%_0_0/0.18),0_0_0_0.5px_oklch(0%_0_0/0.08)] group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-checked:translate-x-4 group-data-[size=sm]/switch:data-checked:translate-x-2.5 group-data-[size=default]/switch:data-unchecked:translate-x-0 group-data-[size=sm]/switch:data-unchecked:translate-x-0 dark:data-checked:bg-primary-foreground dark:data-unchecked:bg-foreground"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }


