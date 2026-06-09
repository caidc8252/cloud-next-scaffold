import { createI18nRequestConfig } from "@cloud/i18n/server";
import type { Locale } from "@cloud/i18n";

export default createI18nRequestConfig({
  loadMessages: async (locale: Locale) => {
    return (await import(`./messages/${locale}.json`)).default;
  },
});
