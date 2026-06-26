"use client"

import * as React from "react"
import { format as formatDate } from "date-fns"
import { CalendarIcon, XIcon } from "lucide-react"
import type { DateRange as RdpDateRange } from "react-day-picker"

import { useTranslations } from "@cloud/i18n/client"

import { cn } from "../../../lib/utils"

import { Popover, PopoverContent, PopoverTrigger } from "../primitives/popover"
import { Calendar } from "../primitives/calendar"
import { Button } from "../primitives/button"
import { Input } from "../primitives/input"
import {
  applyTimeString,
  combineDisabledDays,
  dateTriggerClass,
  toTimeString,
  useDateFormat,
} from "../_date-shared"
import {
  DEFAULT_RANGE_PRESETS,
  type DateRange,
  type DateRangePreset,
} from "./date-range-picker"

interface DateTimeRangePickerProps {
  value?: DateRange | null
  defaultValue?: DateRange | null
  onValueChange?: (value: DateRange | null) => void

  placeholder?: string
  /** Applies to the date part of each end; time is always 24-hour HH:mm. */
  formatStr?: string
  presets?: DateRangePreset[]

  minDate?: Date
  maxDate?: Date
  disabledDays?: (date: Date) => boolean

  size?: "sm" | "md" | "lg"
  disabled?: boolean
  /** Error state: red border/ring on the trigger + aria-invalid (matches Input/Select). */
  invalid?: boolean
  className?: string
  required?: boolean
  id?: string
}

// Date + time range picker. Trigger is a button styled like <Input>; the popover
// holds presets + <Calendar mode="range"> on top and a start/end <input type="time">
// row + OK on the bottom. Value is { from, to } where each Date carries its own
// time-of-day. Unlike DateRangePicker it doesn't auto-close on range completion —
// the user adjusts the times, then confirms with OK (presets behave the same).
function DateTimeRangePicker({
  value: controlledValue,
  defaultValue = null,
  onValueChange,
  placeholder,
  formatStr,
  presets = DEFAULT_RANGE_PRESETS,
  minDate,
  maxDate,
  disabledDays,
  size = "md",
  disabled,
  invalid,
  className,
  required,
  id,
}: DateTimeRangePickerProps) {
  const t = useTranslations("ui.datePicker")
  const tPresets = useTranslations("ui.datePicker.presets")
  const [open, setOpen] = React.useState(false)
  const [internalValue, setInternalValue] = React.useState<DateRange | null>(defaultValue)
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : internalValue
  const { formatStr: fmt, dateFnsLocale } = useDateFormat("dateTime", formatStr)

  // Mid-selection (user picked `from` but not `to`) is internal-only. Time drafts
  // hold the HH:mm for each end and stay in sync when the value changes elsewhere.
  const [draft, setDraft] = React.useState<RdpDateRange | undefined>(
    value ? { from: value.from, to: value.to } : undefined,
  )
  const [fromTime, setFromTime] = React.useState<string>(toTimeString(value?.from))
  const [toTime, setToTime] = React.useState<string>(value ? toTimeString(value.to) : "23:59")
  const [lastValue, setLastValue] = React.useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    setDraft(value ? { from: value.from, to: value.to } : undefined)
    setFromTime(toTimeString(value?.from))
    setToTime(value ? toTimeString(value.to) : "23:59")
  }

  const setValue = (next: DateRange | null) => {
    if (!isControlled) setInternalValue(next)
    onValueChange?.(next)
  }

  const displayText = value
    ? `${formatDate(value.from, fmt, { locale: dateFnsLocale })} – ${formatDate(value.to, fmt, { locale: dateFnsLocale })}`
    : ""

  const showClear = value !== null && !required && !disabled
  const effectivePlaceholder = placeholder ?? t("placeholder.dateTimeRange")

  const localizedLabel = (key: string): string => {
    try {
      return tPresets(key)
    } catch {
      return key
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("relative inline-flex items-stretch", className)}>
        <PopoverTrigger
          id={id}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-label={effectivePlaceholder}
          className={dateTriggerClass(size, showClear)}
        >
          <CalendarIcon className="size-4 shrink-0 text-content-tertiary" />
          <span className={cn("flex-1 truncate text-left", !value && "text-content-tertiary")}>
            {displayText || effectivePlaceholder}
          </span>
        </PopoverTrigger>
        {showClear && (
          <button
            type="button"
            aria-label={t("clear")}
            tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-content-tertiary hover:text-content-primary"
            onClick={(e) => {
              e.stopPropagation()
              setValue(null)
            }}
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>
      <PopoverContent className="w-auto p-0 shadow-3" align="start">
        <div className="flex">
          {presets.length > 0 && (
            <ul className="flex w-32 flex-col gap-0.5 border-r border-line-default p-2">
              {presets.map((p) => (
                <li key={p.key}>
                  <button
                    type="button"
                    className="w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-md text-content-secondary hover:bg-surface-hover hover:text-content-primary"
                    onClick={() => setValue(p.getValue())}
                  >
                    {p.label ?? localizedLabel(p.key)}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Calendar
            mode="range"
            selected={draft}
            // Same two-click handling as DateRangePicker: ignore the range arg and
            // drive selection off `triggerDate` + our own draft, applying the
            // start/end time drafts when the range completes.
            onSelect={(_range, triggerDate, modifiers) => {
              if (modifiers.disabled || !triggerDate) return
              if (!draft?.from || draft.to) {
                setDraft({ from: triggerDate, to: undefined })
                return
              }
              const fromDate = draft.from <= triggerDate ? draft.from : triggerDate
              const toDate = draft.from <= triggerDate ? triggerDate : draft.from
              setDraft({ from: fromDate, to: toDate })
              setValue({ from: applyTimeString(fromDate, fromTime), to: applyTimeString(toDate, toTime) })
            }}
            locale={dateFnsLocale}
            disabled={combineDisabledDays(minDate, maxDate, disabledDays)}
            defaultMonth={value?.from ?? undefined}
            numberOfMonths={2}
          />
        </div>
        <div className="flex flex-col gap-2 border-t border-line-default p-2.5">
          <div className="flex items-center gap-2">
            <span className="w-9 shrink-0 text-xs text-content-secondary">{t("rangeStart")}</span>
            <Input
              type="time"
              inputSize="sm"
              disabled={disabled || !value}
              value={fromTime}
              onChange={(e) => {
                const next = e.target.value || "00:00"
                setFromTime(next)
                if (value) setValue({ from: applyTimeString(value.from, next), to: value.to })
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-9 shrink-0 text-xs text-content-secondary">{t("rangeEnd")}</span>
            <Input
              type="time"
              inputSize="sm"
              disabled={disabled || !value}
              value={toTime}
              onChange={(e) => {
                const next = e.target.value || "00:00"
                setToTime(next)
                if (value) setValue({ from: value.from, to: applyTimeString(value.to, next) })
              }}
            />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setOpen(false)}>
              {t("ok")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { DateTimeRangePicker, type DateTimeRangePickerProps }
