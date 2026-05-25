"use server";

import { cookies } from "next/headers";
import {
  COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE,
  TZ_COOKIE,
  isValidIanaTimeZone,
} from "./cookie.ts";
import { isLocale } from "./index.ts";

export async function setLocaleAction(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax",
  });
}

export async function setTimeZoneAction(tz: string): Promise<void> {
  if (!isValidIanaTimeZone(tz)) return;
  const cookieStore = await cookies();
  cookieStore.set(TZ_COOKIE, tz, {
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax",
  });
}
