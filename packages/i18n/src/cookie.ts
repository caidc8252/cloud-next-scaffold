import { defaultLocale, isLocale, type Locale } from "./index.ts";

export const LOCALE_COOKIE = "locale";
export const TZ_COOKIE = "tz";
export const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export type ReadonlyCookieStore = {
  get(name: string): { value: string } | undefined;
};

export function readLocaleCookie(cookieStore: ReadonlyCookieStore): Locale {
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

export function readTimeZoneCookie(
  cookieStore: ReadonlyCookieStore,
  fallback = "UTC",
): string {
  const value = cookieStore.get(TZ_COOKIE)?.value;
  if (!value) return fallback;
  return isValidIanaTimeZone(value) ? value : fallback;
}

export function isValidIanaTimeZone(tz: string): boolean {
  // 用 DateTimeFormat 试构造而不是 Intl.supportedValuesOf —— 后者在不同 runtime 不一定收录
  // 像 "UTC" 这种常用别名，而 DateTimeFormat 始终接受合法 zone、对非法 zone 抛 RangeError。
  if (typeof tz !== "string" || tz.length === 0) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
