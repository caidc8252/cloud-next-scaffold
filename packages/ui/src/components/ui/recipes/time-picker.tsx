"use client"

import * as React from "react"
import { ClockIcon, XIcon } from "lucide-react"

import { useTranslations } from "@cloud/i18n/client"

import { cn } from "../../../lib/utils"
import { Input } from "../primitives/input"

interface TimePickerProps {
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null) => void

  placeholder?: string
  /** Show a seconds field; value becomes "HH:mm:ss". @default false */
  withSeconds?: boolean
  /** Native `step` in seconds. Overrides the implicit step=1 that `withSeconds` sets. */
  step?: number
  /** Earliest selectable time as "HH:mm"[:ss] (native `min`). */
  min?: string
  /** Latest selectable time as "HH:mm"[:ss] (native `max`). */
  max?: string

  size?: "sm" | "md" | "lg"
  disabled?: boolean
  className?: string
  name?: string
  required?: boolean
  id?: string
}

// Time-only picker built on the native <input type="time"> — same approach as the
// shadcn base date-picker's time field. The value is a 24-hour "HH:mm" string (or
// "HH:mm:ss" when `withSeconds`); the browser renders it 12h/24h per the user's
// locale automatically. A leading clock icon + clear button mirror the DatePicker
// family, and the native calendar-picker indicator is hidden in favor of the icon.
function TimePicker({
  value: controlledValue,
  defaultValue = null,
  onValueChange,
  placeholder,
  withSeconds = false,
  step,
  min,
  max,
  size = "md",
  disabled,
  className,
  name,
  required,
  id,
}: TimePickerProps) {
  const t = useTranslations("ui.datePicker")
  const [internalValue, setInternalValue] = React.useState<string | null>(defaultValue)
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : internalValue

  const setValue = (next: string | null) => {
    if (!isControlled) setInternalValue(next)
    onValueChange?.(next)
  }

  const effectivePlaceholder = placeholder ?? t("placeholder.time")
  const resolvedStep = step ?? (withSeconds ? 1 : undefined)
  const showClear = value != null && value !== "" && !required && !disabled

  return (
    <Input
      type="time"
      id={id}
      name={name}
      step={resolvedStep}
      min={min}
      max={max}
      required={required}
      disabled={disabled}
      inputSize={size}
      aria-label={effectivePlaceholder}
      value={value ?? ""}
      onChange={(e) => setValue(e.target.value === "" ? null : e.target.value)}
      className={cn(
        "tabular-nums [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none",
        className,
      )}
      prefix={<ClockIcon className="size-4" />}
      suffix={
        showClear ? (
          <button
            type="button"
            aria-label={t("clear")}
            tabIndex={-1}
            className="cursor-pointer text-content-tertiary hover:text-content-primary"
            onClick={() => setValue(null)}
          >
            <XIcon className="size-3.5" />
          </button>
        ) : undefined
      }
    />
  )
}

export { TimePicker, type TimePickerProps }
