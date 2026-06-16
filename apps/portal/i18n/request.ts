import { createI18nRequestConfig } from "@cloud/i18n/server";
import type { Locale } from "@cloud/i18n";

// next-intl 的 request config 入口。createI18nRequestConfig 读 locale/tz cookie，
// 先加载 en 作为基底，再 deepMerge 当前 locale；缺 key 自动回退英文。
// portal 注入门户页面文案；真实 auth API 的错误文案由 route 侧注册表处理。
export default createI18nRequestConfig({
  loadMessages: async (locale: Locale) => {
    const messages = (await import(`./messages/${locale}.json`)).default;
    // coc 命名空间：菜单 / 权限 / 角色文案（gen:manifest 全量并集产物）。
    const coc = (await import(`@/manifest/_generated/i18n/${locale}.json`)).default;
    return { ...messages, coc };
  },
});
