"use client"

import * as React from "react"
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group"

import { cn } from "../../lib/utils"

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
}

type ToggleGroupProps =
  | (ToggleGroupSingleProps & ToggleGroupBaseProps)
  | (ToggleGroupMultipleProps & ToggleGroupBaseProps)

// Segmented group of <Toggle> items. Set type="single" for radio-like (max one
// pressed) or type="multiple" for independent toggles. Children must be <Toggle>
// instances with a `value` prop; ToggleGroup matches them by value.
function ToggleGroup(props: ToggleGroupProps) {
  const { disabled, className, children } = props

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
        multiple={false}
        value={value}
        defaultValue={defaultValue}
        onValueChange={(arr) => props.onValueChange?.(arr[0] ?? null)}
        disabled={disabled}
        className={cn(
          "inline-flex items-center rounded-md border border-line-strong overflow-hidden bg-surface-2",
          className,
        )}
      >
        {children}
      </ToggleGroupPrimitive>
    )
  }

  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      multiple={true}
      value={props.value}
      defaultValue={props.defaultValue}
      onValueChange={(arr) => props.onValueChange?.(arr)}
      disabled={disabled}
      className={cn(
        "inline-flex items-center rounded-md border border-line-strong overflow-hidden bg-surface-2",
        className,
      )}
    >
      {children}
    </ToggleGroupPrimitive>
  )
}

export { ToggleGroup, type ToggleGroupProps }
