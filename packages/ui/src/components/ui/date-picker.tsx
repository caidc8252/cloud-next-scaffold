"use client"

import * as React from "react"
import { format as formatDate } from "date-fns"
import { CalendarIcon, XIcon } from "lucide-react"

import { useTranslations } from "@cloud/i18n/client"

import { cn } from "../../lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Calendar } from "./calendar"
import { combineDisabledDays, dateTriggerClass, useDateFormat } from "./_date-shared"

interface DatePickerProps {
  value?: Date | null
  defaultValue?: Date | null
  onValueChange?: (value: Date | null) => void

  placeholder?: string
  formatStr?: string

  minDate?: Date
  maxDate?: Date
  disabledDays?: (date: Date) => boolean

  size?: "sm" | "md" | "lg"
  disabled?: boolean
  className?: string
  name?: string
  required?: boolean
  id?: string
}

// Single-date picker. Trigger is a button styled to look like <Input>; clicking
// opens a popover with <Calendar mode="single">. Value type is Date | null.
function DatePicker({
  value: controlledValue,
  defaultValue = null,
  onValueChange,
  placeholder,
  formatStr,
  minDate,
  maxDate,
  disabledDays,
  size = "md",
  disabled,
  className,
  name,
  required,
  id,
}: DatePickerProps) {
  const t = useTranslations("ui.datePicker")
  const [open, setOpen] = React.useState(false)
  const [internalValue, setInternalValue] = React.useState<Date | null>(defaultValue)
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : internalValue
  const { formatStr: fmt, dateFnsLocale } = useDateFormat("date", formatStr)

  const effectivePlaceholder = placeholder ?? t("placeholder.date")
  const displayText = value ? formatDate(value, fmt, { locale: dateFnsLocale }) : ""
  const hiddenValue = value ? formatDate(value, "yyyy-MM-dd") : ""
  const showClear = value !== null && !required && !disabled

  const setValue = (next: Date | null) => {
    if (!isControlled) setInternalValue(next)
    onValueChange?.(next)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("relative inline-flex items-stretch", className)}>
        <PopoverTrigger
          id={id}
          disabled={disabled}
          aria-label={effectivePlaceholder}
          className={dateTriggerClass(size, showClear)}
        >
          <CalendarIcon className="size-4 shrink-0 text-content-tertiary" />
          <span
            className={cn(
              "flex-1 truncate text-left",
              !value && "text-content-tertiary",
            )}
          >
            {displayText || effectivePlaceholder}
          </span>
        </PopoverTrigger>
        {showClear && (
          <button
            type="button"
            aria-label={t("clear")}
            tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-content-tertiary hover:text-content-primary cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              setValue(null)
            }}
          >
            <XIcon className="size-3.5" />
          </button>
        )}
        {name && <input type="hidden" name={name} value={hiddenValue} />}
      </div>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={(d) => {
            setValue(d ?? null)
            if (d) setOpen(false)
          }}
          locale={dateFnsLocale}
          disabled={combineDisabledDays(minDate, maxDate, disabledDays)}
          defaultMonth={value ?? undefined}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker, type DatePickerProps }
