import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { CheckIcon } from "lucide-react"

import { cn } from "../../lib/utils"
import { Label } from "./label"

/* ── Checkbox ── */

interface ToggleCheckboxProps {
  id?: string
  label?: React.ReactNode
  checked?: boolean
  defaultChecked?: boolean
  indeterminate?: boolean
  disabled?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
}

// Checkbox with an optional inline label. indeterminate shows a dash indicator. Supports controlled (checked) and uncontrolled (defaultChecked) modes.
function ToggleCheckbox({
  id,
  label,
  checked,
  defaultChecked,
  indeterminate,
  disabled,
  onCheckedChange,
  className,
}: ToggleCheckboxProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  return (
    <div className="flex items-center gap-2">
      <CheckboxPrimitive.Root
        id={inputId}
        checked={checked}
        defaultChecked={defaultChecked}
        indeterminate={indeterminate}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        data-slot="checkbox"
        className={cn(
          "peer relative flex size-4 shrink-0 items-center justify-center rounded-sm border border-line-strong bg-surface-2 transition-colors outline-none cursor-pointer after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:bg-input/30 dark:data-checked:bg-primary",
          className
        )}
      >
        <CheckboxPrimitive.Indicator
          data-slot="checkbox-indicator"
          className="grid place-content-center text-current transition-none [&>svg]:size-2.5"
        >
          <CheckIcon />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label && <Label htmlFor={inputId}>{label}</Label>}
    </div>
  )
}

/* ── Radio ── */

interface ToggleRadioGroupProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  className?: string
  children?: React.ReactNode
}

// Parent container that manages the selected value for a group of ToggleRadio items.
function ToggleRadioGroup({
  className,
  ...props
}: ToggleRadioGroupProps) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("flex flex-wrap gap-4", className)}
      {...props}
    />
  )
}

interface ToggleRadioProps {
  id?: string
  value: string
  label?: React.ReactNode
  disabled?: boolean
  className?: string
}

// Single radio option inside ToggleRadioGroup. value is required; label is optional inline text.
function ToggleRadio({
  id,
  value,
  label,
  disabled,
  className,
}: ToggleRadioProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  return (
    <div className="flex items-center gap-2">
      <RadioPrimitive.Root
        id={inputId}
        value={value}
        disabled={disabled}
        data-slot="radio-group-item"
        className={cn(
          "group/radio relative flex aspect-square size-4 shrink-0 rounded-full border border-line-strong bg-surface-2 outline-none cursor-pointer after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary",
          className
        )}
      >
        <RadioPrimitive.Indicator
          data-slot="radio-group-indicator"
          className="flex size-4 items-center justify-center"
        >
          <span className="absolute top-1/2 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground" />
        </RadioPrimitive.Indicator>
      </RadioPrimitive.Root>
      {label && <Label htmlFor={inputId}>{label}</Label>}
    </div>
  )
}

/* ── Switch ── */

interface ToggleSwitchProps {
  id?: string
  label?: React.ReactNode
  checked?: boolean
  defaultChecked?: boolean
  disabled?: boolean
  size?: "sm" | "default"
  onCheckedChange?: (checked: boolean) => void
  className?: string
}

// Toggle switch with optional inline label. size: 'sm'(24×14px)|'default'(36×20px). Supports controlled and uncontrolled modes.
function ToggleSwitch({
  id,
  label,
  checked,
  defaultChecked,
  disabled,
  size = "default",
  onCheckedChange,
  className,
}: ToggleSwitchProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  return (
    <div className="flex items-center gap-2">
      <SwitchPrimitive.Root
        id={inputId}
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        data-slot="switch"
        data-size={size}
        className={cn(
          "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none cursor-pointer after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:shadow-focus data-[size=default]:h-5 data-[size=default]:w-9 data-[size=sm]:h-3.5 data-[size=sm]:w-6 data-unchecked:bg-line-strong data-checked:bg-primary data-checked:shadow-cta data-checked:hover:bg-primary-600 dark:data-unchecked:bg-input/80 data-disabled:cursor-not-allowed data-disabled:opacity-50",
          className
        )}
      >
        <SwitchPrimitive.Thumb
          data-slot="switch-thumb"
          className="pointer-events-none block rounded-full bg-background ring-0 transition-transform shadow-[0_1px_2px_oklch(0%_0_0/0.18),0_0_0_0.5px_oklch(0%_0_0/0.08)] group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-checked:translate-x-4 group-data-[size=sm]/switch:data-checked:translate-x-2.5 group-data-[size=default]/switch:data-unchecked:translate-x-0 group-data-[size=sm]/switch:data-unchecked:translate-x-0 dark:data-checked:bg-primary-foreground dark:data-unchecked:bg-foreground"
        />
      </SwitchPrimitive.Root>
      {label && <Label htmlFor={inputId}>{label}</Label>}
    </div>
  )
}

export { ToggleCheckbox, ToggleRadioGroup, ToggleRadio, ToggleSwitch }
export type { ToggleCheckboxProps, ToggleRadioGroupProps, ToggleRadioProps, ToggleSwitchProps }


