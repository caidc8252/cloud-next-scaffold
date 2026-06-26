"use client"

import * as React from "react"
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group"

import { cn } from "../../../lib/utils"

type ToggleGroupSingleProps = {
  type: "single"
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null) => void
}

type ToggleGroupMultipleProps = {
  type: "multiple"
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
}

type ToggleGroupBaseProps = {
  disabled?: boolean
  className?: string
  children?: React.ReactNode
  /**
   * Visual style. Exposed to child <Toggle>s through the `data-variant`
   * attribute set on the root — toggle.tsx keys its `in-data-[variant=…]`
   * styles off it, so child items restyle without any prop threading.
   * - "outline" (default): connected segments sharing one outer border.
   * - "segmented": TOMS-style segmented control (`.tds-btn-group`) — a tinted
   *   track of borderless items where the selected one lifts into a pill
   *   (bg-surface-2 + shadow-1). Use with type="single" for an OS / mode picker.
   * - "cloud": free-wrapping standalone pill chips (NOT a connected track). Each
   *   <Toggle> is its own rounded-full bordered chip; the selected one(s) tint
   *   primary. Items wrap; children may be icon+text. Works with type="single"
   *   or "multiple" — use for tag / category pickers.
   * - "plain": no visual restyling of child <Toggle>s; use when children are
   *   custom option cards / tiles that own their selected styling.
   */
  variant?: "outline" | "segmented" | "cloud" | "plain"
}

type ToggleGroupProps =
  | (ToggleGroupSingleProps & ToggleGroupBaseProps)
  | (ToggleGroupMultipleProps & ToggleGroupBaseProps)

// Container styling per variant. Child items react to the variant via the
// root's `data-variant` attribute, not via props (see toggle.tsx).
const containerClass = {
  // Items share a single rounded outer border; toggle.tsx flattens their edges.
  outline:
    "inline-flex items-center rounded-md border border-line-strong overflow-hidden bg-surface-2",
  // Tinted track with internal padding + gap; items float as pills on top.
  segmented:
    "inline-flex items-center gap-px rounded-md border border-line-subtle bg-surface-3 p-0.5",
  // No track at all: items wrap freely as separate chips.
  cloud: "flex flex-wrap items-center gap-1.5",
  // No track and no child styling: caller controls item layout and selected look.
  plain: "flex flex-wrap items-center gap-2",
} as const

// Segmented group of <Toggle> items. Set type="single" for radio-like (max one
// pressed) or type="multiple" for independent toggles. Children must be <Toggle>
// instances with a `value` prop; ToggleGroup matches them by value.
// `variant` switches the look between connected segments, a TOMS pill track,
// standalone cloud chips, or a plain container for custom option cards.
function ToggleGroup(props: ToggleGroupProps) {
  const { disabled, className, children, variant = "outline" } = props

  if (props.type === "single") {
    const value =
      props.value === undefined
        ? undefined
        : props.value === null
          ? []
          : [props.value]
    const defaultValue =
      props.defaultValue === undefined
        ? undefined
        : props.defaultValue === null
          ? []
          : [props.defaultValue]
    return (
      <ToggleGroupPrimitive
        data-slot="toggle-group"
        data-variant={variant}
        multiple={false}
        value={value}
        defaultValue={defaultValue}
        onValueChange={(arr) => props.onValueChange?.(arr[0] ?? null)}
        disabled={disabled}
        className={cn(containerClass[variant], className)}
      >
        {children}
      </ToggleGroupPrimitive>
    )
  }

  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      data-variant={variant}
      multiple={true}
      value={props.value}
      defaultValue={props.defaultValue}
      onValueChange={(arr) => props.onValueChange?.(arr)}
      disabled={disabled}
      className={cn(containerClass[variant], className)}
    >
      {children}
    </ToggleGroupPrimitive>
  )
}

export { ToggleGroup, type ToggleGroupProps }
