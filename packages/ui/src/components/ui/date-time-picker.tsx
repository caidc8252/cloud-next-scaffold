"use client"

import * as React from "react"
import { format as formatDate, setHours, setMinutes } from "date-fns"
import { CalendarIcon, XIcon } from "lucide-react"

import { useTranslations } from "@cloud/i18n/client"

import { cn } from "../../lib/utils"

import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Calendar } from "./calendar"
import { Button } from "./button"
import { Input } from "./input"
import { combineDisabledDays, dateTriggerClass, useDateFormat } from "./_date-shared"

interface DateTimePickerProps {
  value?: Date | null
  defaultValue?: Date | null
  onValueChange?: (value: Date | null) => void

  placeholder?: string
  formatStr?: string

  minDate?: Date
  maxDate?: Date

  size?: "sm" | "md" | "lg"
  disabled?: boolean
  className?: string
  name?: string
  required?: boolean
  id?: string
}

function toTimeString(d: Date | null | undefined): string {
  if (!d) return "00:00"
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

function applyTimeString(d: Date, hhmm: string): Date {
  const [hStr, mStr] = hhmm.split(":")
  return setMinutes(setHours(d, Number(hStr)), Number(mStr))
}

// Single date + time picker. Trigger is a button styled to look like <Input>;
// clicking opens a popover with <Calendar mode="single"> on top and a native
// <input type="time"> + OK button on the bottom. formatStr applies to the date
// part only; time is always rendered as 24-hour HH:mm. Hidden input emits the
// full ISO string (value.toISOString()).
function DateTimePicker({
  value: controlledValue,
  defaultValue = null,
  onValueChange,
  placeholder,
  formatStr,
  minDate,
  maxDate,
  size = "md",
  disabled,
  className,
  name,
  required,
  id,
}: DateTimePickerProps) {
  const t = useTranslations("ui.datePicker")
  const [open, setOpen] = React.useState(false)
  const [internalValue, setInternalValue] = React.useState<Date | null>(defaultValue)
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : internalValue
  const { formatStr: fmt, dateFnsLocale } = useDateFormat("date", formatStr)

  const setValue = (next: Date | null) => {
    if (!isControlled) setInternalValue(next)
    onValueChange?.(next)
  }

  const displayText = value
    ? `${formatDate(value, fmt, { locale: dateFnsLocale })} ${toTimeString(value)}`
    : ""
  const hiddenValue = value ? value.toISOString() : ""
  const showClear = value !== null && !required && !disabled
  const effectivePlaceholder = placeholder ?? t("placeholder.dateTime")

  // Mirror the current value's HH:mm into a local draft so the <input type="time">
  // stays in sync when the value is changed externally or via the calendar.
  const [draftTime, setDraftTime] = React.useState<string>(toTimeString(value))
  const [lastValue, setLastValue] = React.useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    setDraftTime(toTimeString(value))
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
            if (!d) {
              setValue(null)
              return
            }
            setValue(applyTimeString(d, draftTime))
          }}
          locale={dateFnsLocale}
          disabled={combineDisabledDays(minDate, maxDate)}
          defaultMonth={value ?? undefined}
        />
        <div className="flex items-center justify-between gap-2 border-t border-line-default p-2.5">
          <Input
            type="time"
            inputSize="sm"
            disabled={disabled}
            value={draftTime}
            onChange={(e) => {
              const next = e.target.value
              setDraftTime(next)
              if (value) setValue(applyTimeString(value, next))
            }}
          />
          <Button size="sm" onClick={() => setOpen(false)}>
            {t("ok")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { DateTimePicker, type DateTimePickerProps }
