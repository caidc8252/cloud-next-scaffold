import { createI18nRequestConfig } from "@cloud/i18n/server";
import type { Locale } from "@cloud/i18n";

// next-intl 的 request config 入口。createI18nRequestConfig 读 locale/tz cookie，
// 先加载 en 作为基底，再 deepMerge 当前 locale；缺 key 自动回退英文。
// portal 是 mock 原型，错误文案不接 @cloud/request 注册表（无业务域错误码），
// 仅注入门户页面文案。
export default createI18nRequestConfig({
  loadMessages: async (locale: Locale) => {
    const messages = (await import(`./messages/${locale}.json`)).default;
    return messages;
  },
});
