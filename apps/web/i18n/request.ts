import { createI18nRequestConfig } from "@cloud/i18n/server";
import type { Locale } from "@cloud/i18n";
import { getErrorMessages } from "@cloud/request/error-messages";

// next-intl 的 request config 入口。createI18nRequestConfig 内部读取 locale/tz
// cookie，先加载 en 作为基底，再 deepMerge 当前 locale；缺 key 自动回退英文。
// messages 按 locale 拆文件，动态 import 后取 default。
// errors 命名空间的文案来自 @cloud/request（与错误码同源、可跨项目复用），
// 在这里注入而不写进 messages/*.json，避免和包里的错误码漂移。
export default createI18nRequestConfig({
  loadMessages: async (locale: Locale) => {
    const messages = (await import(`./messages/${locale}.json`)).default;
    return { ...messages, errors: getErrorMessages(locale) };
  },
});
