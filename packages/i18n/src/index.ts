export const locales = ["en", "zh-CN", "ja"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  "zh-CN": "中文",
  ja: "日本語",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export { LOCALE_COOKIE, TZ_COOKIE, COOKIE_MAX_AGE_SECONDS } from "./cookie.ts";
export { numberFormats, dateTimeFormats, formats } from "./formats.ts";
export type { I18nFormats } from "./formats.ts";
