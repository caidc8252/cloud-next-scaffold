import { createI18nRequestConfig } from "@cloud/i18n/server";
import type { Locale } from "@cloud/i18n";
import { getAllErrorMessages } from "@cloud/request/server";
// 饿汉注册 app 业务域错误文案（auth 等），保证 errors 命名空间 / 服务端响应辅助
// 在纯页面请求下也能本地化这些 code（详见该模块注释）。
import "@/lib/register-error-messages";

// next-intl 的 request config 入口。createI18nRequestConfig 内部读取 locale/tz
// cookie，先加载 en 作为基底，再 deepMerge 当前 locale；缺 key 自动回退英文。
// messages 按 locale 拆文件，动态 import 后取 default。
// errors 命名空间用 getAllErrorMessages（内置 + app 注册的合并表），与服务端响应体
// message 同源——客户端 / RSC 按 code 重译与服务端本地化结果一致。
export default createI18nRequestConfig({
  loadMessages: async (locale: Locale) => {
    const messages = (await import(`./messages/${locale}.json`)).default;
    return { ...messages, errors: getAllErrorMessages(locale) };
  },
});
