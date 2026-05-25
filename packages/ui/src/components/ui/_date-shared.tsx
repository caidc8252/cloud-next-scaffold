"use client"

import { type Locale, isLocale } from "@cloud/i18n"
import { useLocale } from "@cloud/i18n/client"
import { startOfDay, endOfDay } from "date-fns"
import { enUS, zhCN, ja, type Locale as DateFnsLocale } from "date-fns/locale"

import { cn } from "../../lib/utils"

type FormatKind = "date" | "dateTime"

const dateFnsLocales: Record<Locale, DateFnsLocale> = {
  "en": enUS,
  "zh-CN": zhCN,
  "ja": ja,
}

const defaultFormats: Record<FormatKind, Record<Locale, string>> = {
  date: {
    "en": "MMM d, yyyy",
    "zh-CN": "yyyy年M月d日",
    "ja": "yyyy年M月d日",
  },
  dateTime: {
    "en": "MMM d, yyyy HH:mm",
    "zh-CN": "yyyy年M月d日 HH:mm",
    "ja": "yyyy年M月d日 HH:mm",
  },
}

// Returns the date-fns Locale + the effective format string for the current locale.
// override beats the locale default; falls back to English when current locale is unrecognized.
function useDateFormat(kind: FormatKind, override?: string) {
  const raw = useLocale()
  const locale: Locale = isLocale(raw) ? raw : "en"
  return {
    formatStr: override ?? defaultFormats[kind][locale],
    dateFnsLocale: dateFnsLocales[locale],
    locale,
  }
}

const triggerSizeClass: Record<"sm" | "md" | "lg", string> = {
  sm: "h-control-sm px-cx-sm text-xs",
  md: "h-control-md px-cx-md text-sm",
  lg: "h-control-lg px-cx-lg text-base",
}

// Tailwind class string for the input-styled trigger button that all three
// date pickers share. showClear adds right padding to make room for the X icon.
function dateTriggerClass(size: "sm" | "md" | "lg", showClear: boolean): string {
  return cn(
    "inline-flex w-full items-center gap-2 rounded-md border border-line-default bg-surface-2 transition-colors outline-none cursor-pointer hover:border-line-strong focus-visible:border-line-focus focus-visible:ring-2 focus-visible:ring-line-focus/30 disabled:cursor-not-allowed disabled:opacity-50",
    triggerSizeClass[size],
    showClear && "pr-7",
  )
}

// Combine optional min/max date bounds with a caller-provided disabledDays
// matcher. min/max are normalized to start-of-day / end-of-day so passing
// intraday timestamps doesn't accidentally disable the boundary day. Returns
// undefined when no constraints are active so the caller can skip the prop.
function combineDisabledDays(
  minDate?: Date,
  maxDate?: Date,
  disabledDays?: (date: Date) => boolean,
): ((d: Date) => boolean) | undefined {
  const matchers: Array<(d: Date) => boolean> = []
  if (minDate) {
    const min = startOfDay(minDate)
    matchers.push((d) => d < min)
  }
  if (maxDate) {
    const max = endOfDay(maxDate)
    matchers.push((d) => d > max)
  }
  if (disabledDays) matchers.push(disabledDays)
  if (matchers.length === 0) return undefined
  return (d) => matchers.some((fn) => fn(d))
}

export { useDateFormat, dateFnsLocales, defaultFormats, dateTriggerClass, combineDisabledDays }
