"use client";

import { useEffect, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTimeZone } from "next-intl";
import { setTimeZoneAction } from "./actions.ts";

export {
  NextIntlClientProvider,
  useTranslations,
  useFormatter,
  useLocale,
  useTimeZone,
  useNow,
} from "next-intl";

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
