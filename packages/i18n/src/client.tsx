"use client";

import {
  useEffect,
  useTransition,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTimeZone } from "next-intl";
import { setLocaleAction, setTimeZoneAction } from "./actions.ts";
import { locales, localeLabels, type Locale, isLocale } from "./index.ts";

export { useTranslations, useFormatter, useLocale, useTimeZone, useNow } from "next-intl";

/**
 * 首次进入时检测浏览器 TZ，与 cookie 不一致就同步并 refresh。
 * 挂在 root layout 内 NextIntlClientProvider 之下即可。
 */
export function TimeZoneInit(): ReactNode {
  const current = useTimeZone();
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    let detected: string | undefined;
    try {
      detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }
    if (!detected || detected === current) return;
    startTransition(async () => {
      await setTimeZoneAction(detected!);
      router.refresh();
    });
    // current 来自 next-intl，跨请求会变；ref-stable
  }, [current, router]);

  return null;
}

export function LocaleSwitcher({
  className,
}: {
  className?: string;
}): ReactNode {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(event: ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    if (!isLocale(next) || next === locale) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <select
      value={locale}
      onChange={onChange}
      disabled={pending}
      className={
        className ??
        "h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-700 hover:border-zinc-300"
      }
      aria-label="Select language"
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {localeLabels[l]}
        </option>
      ))}
    </select>
  );
}
