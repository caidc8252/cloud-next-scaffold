import "server-only";

import { cookies } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "@cloud/i18n";

// cookie → locale。供 createApiHandler 的 resolveLocale 使用。
// cookies() 在非请求上下文（如单测直接调用包装后的 handler）会抛，这里兜底回退默认 locale。
export async function resolveLocaleFromCookie(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const value = cookieStore.get(LOCALE_COOKIE)?.value;
    return isLocale(value) ? value : defaultLocale;
  } catch {
    return defaultLocale;
  }
}
