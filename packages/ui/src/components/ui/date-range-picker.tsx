"use client"

import * as React from "react"
import {
  endOfDay,
  endOfMonth,
  format as formatDate,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns"
import { CalendarIcon, XIcon } from "lucide-react"
import type { DateRange as RdpDateRange } from "react-day-picker"

import { useTranslations } from "@cloud/i18n/client"

import { cn } from "../../lib/utils"

import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Calendar } from "./calendar"
import { combineDisabledDays, dateTriggerClass, useDateFormat } from "./_date-shared"

interface DateRange {
  from: Date
  to: Date
}

interface DateRangePreset {
  key: string
  label?: React.ReactNode
  getValue: (now?: Date) => DateRange
}

// Built-in presets. Each `getValue` accepts an optional reference date so
// tests (and callers wanting deterministic boundaries) can pin "now".
const DEFAULT_RANGE_PRESETS: DateRangePreset[] = [
  {
    key: "today",
    getValue: (now = new Date()) => ({
      from: startOfDay(now),
      to: endOfDay(now),
    }),
  },
  {
    key: "last7",
    getValue: (now = new Date()) => ({
      from: startOfDay(subDays(now, 6)),
      to: endOfDay(now),
    }),
  },
  {
    key: "last30",
    getValue: (now = new Date()) => ({
      from: startOfDay(subDays(now, 29)),
      to: endOfDay(now),
    }),
  },
  {
    key: "thisMonth",
    getValue: (now = new Date()) => ({
      from: startOfMonth(now),
      to: endOfMonth(now),
    }),
  },
  {
    key: "lastMonth",
    getValue: (now = new Date()) => {
      const prev = subMonths(now, 1)
      return { from: startOfMonth(prev), to: endOfMonth(prev) }
    },
  },
]

interface DateRangePickerProps {
  value?: DateRange | null
  defaultValue?: DateRange | null
  onValueChange?: (value: DateRange | null) => void

  placeholder?: string
  formatStr?: string
  presets?: DateRangePreset[]

  minDate?: Date
  maxDate?: Date
  disabledDays?: (date: Date) => boolean

  size?: "sm" | "md" | "lg"
  disabled?: boolean
  className?: string
  required?: boolean
  id?: string
}

// Date range picker. Trigger is a button styled to look like <Input>; clicking
// opens a popover with built-in presets on the left and <Calendar mode="range">
// on the right. onValueChange only fires when both ends are picked — partial
// mid-selection is held in `draft` state.
function DateRangePicker({
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
  className,
  required,
  id,
}: DateRangePickerProps) {
  const t = useTranslations("ui.datePicker")
  const tPresets = useTranslations("ui.datePicker.presets")
  const [open, setOpen] = React.useState(false)
  const [internalValue, setInternalValue] = React.useState<DateRange | null>(defaultValue)
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : internalValue
  const { formatStr: fmt, dateFnsLocale } = useDateFormat("date", formatStr)

  // Mid-selection (user picked `from` but not `to`) is internal-only and
  // not exposed via onValueChange.
  const [draft, setDraft] = React.useState<RdpDateRange | undefined>(
    value ? { from: value.from, to: value.to } : undefined,
  )
  const [lastValue, setLastValue] = React.useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    setDraft(value ? { from: value.from, to: value.to } : undefined)
  }

  const setValue = (next: DateRange | null) => {
    if (!isControlled) setInternalValue(next)
    onValueChange?.(next)
  }

  const displayText = value
    ? `${formatDate(value.from, fmt, { locale: dateFnsLocale })} – ${formatDate(value.to, fmt, { locale: dateFnsLocale })}`
    : ""

  const showClear = value !== null && !required && !disabled
  const effectivePlaceholder = placeholder ?? t("placeholder.range")

  // Translate preset key via the presets namespace. Custom presets with
  // unknown keys fall back to the raw key string.
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
      </div>
      <PopoverContent className="flex w-auto p-0" align="start">
        {presets.length > 0 && (
          <ul className="flex w-32 flex-col gap-0.5 border-r border-line-default p-2">
            {presets.map((p) => (
              <li key={p.key}>
                <button
                  type="button"
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm text-content-secondary hover:bg-surface-hover hover:text-content-primary cursor-pointer"
                  onClick={() => {
                    const next = p.getValue()
                    setValue(next)
                    setOpen(false)
                  }}
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
          onSelect={(range) => {
            setDraft(range)
            if (range?.from && range.to) {
              setValue({ from: range.from, to: range.to })
              setOpen(false)
            }
          }}
          locale={dateFnsLocale}
          disabled={combineDisabledDays(minDate, maxDate, disabledDays)}
          defaultMonth={value?.from ?? undefined}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}

export {
  DateRangePicker,
  DEFAULT_RANGE_PRESETS,
  type DateRangePickerProps,
  type DateRange,
  type DateRangePreset,
}
