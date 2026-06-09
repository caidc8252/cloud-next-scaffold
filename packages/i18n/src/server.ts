import "server-only";

import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { IntlErrorCode } from "next-intl";
import {
  readLocaleCookie,
  readTimeZoneCookie,
} from "./cookie.ts";
import { type Locale } from "./index.ts";
import { formats } from "./formats.ts";
import { deepMerge } from "./deep-merge.ts";

export { deepMerge } from "./deep-merge.ts";
export { setLocaleAction, setTimeZoneAction } from "./actions.ts";

// async 服务端组件（RSC / route handler）取翻译 / 格式化 / locale 的入口。
// 业务代码不直接 import next-intl，统一从 @cloud/i18n/server 取；client 组件用
// @cloud/i18n/client 的同名 hook。useTranslations 是 hook，不能在 async 组件里调，
// 服务端一律用 getTranslations。
export {
  getTranslations,
  getFormatter,
  getLocale,
  getMessages,
  getTimeZone,
} from "next-intl/server";

type Messages = Record<string, unknown>;

type CreateConfigOptions = {
  loadMessages: (locale: Locale) => Promise<Messages>;
};

export function createI18nRequestConfig({ loadMessages }: CreateConfigOptions) {
  return getRequestConfig(async () => {
    const cookieStore = await cookies();
    const locale = readLocaleCookie(cookieStore);
    const timeZone = readTimeZoneCookie(cookieStore);

    const enMessages = await loadMessages("en");
    const messages =
      locale === "en"
        ? enMessages
        : deepMerge(enMessages, await loadMessages(locale));

    return {
      locale,
      timeZone,
      messages,
      formats,
      onError: createOnError(),
      getMessageFallback: createFallback(),
    };
  });
}

function createOnError() {
  return (error: { code: string; message?: string }) => {
    if (process.env.NODE_ENV === "production") return;
    console.error(`[i18n] ${error.code}: ${error.message ?? ""}`);
  };
}

function createFallback() {
  return ({
    namespace,
    key,
    error,
  }: {
    namespace?: string;
    key: string;
    error: { code: string };
  }) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    if (error.code === IntlErrorCode.MISSING_MESSAGE && process.env.NODE_ENV !== "production") {
      throw new Error(`[i18n] missing message: ${fullKey}`);
    }
    return fullKey;
  };
}
