export const numberFormats = {
  decimal: { maximumFractionDigits: 2 },
  integer: { maximumFractionDigits: 0 },
  percent: { style: "percent", maximumFractionDigits: 1 },
  CNY: { style: "currency", currency: "CNY" },
  USD: { style: "currency", currency: "USD" },
  JPY: { style: "currency", currency: "JPY", maximumFractionDigits: 0 },
} as const satisfies Record<string, Intl.NumberFormatOptions>;

export const dateTimeFormats = {
  short: { year: "numeric", month: "2-digit", day: "2-digit" },
  long: { year: "numeric", month: "long", day: "numeric", weekday: "short" },
  time: { hour: "2-digit", minute: "2-digit" },
  dateTime: {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

export const formats = {
  number: numberFormats,
  dateTime: dateTimeFormats,
} as const;

export type I18nFormats = typeof formats;
