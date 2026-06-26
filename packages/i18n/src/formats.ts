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
  // 月份用缩写名的日期（"Jun 1, 2026"）—— 列表 / 详情等需要可读日期而非纯数字时用。
  medium: { year: "numeric", month: "short", day: "numeric" },
  long: { year: "numeric", month: "long", day: "numeric", weekday: "short" },
  time: { hour: "2-digit", minute: "2-digit" },
  dateTime: {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  },
  // 月份缩写名 + 时间（"Jun 1, 2026, 09:14"）—— 详情里的注册时间等。
  mediumDateTime: {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

export const formats = {
  number: numberFormats,
  dateTime: dateTimeFormats,
} as const;

export type I18nFormats = typeof formats;
