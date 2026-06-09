import { cookies } from "next/headers";
import { LOCALE_COOKIE, defaultLocale, isLocale } from "@cloud/i18n";
import { NextIntlClientProvider, TimeZoneInit } from "@cloud/i18n/client";
import { getMessages, getTimeZone } from "@cloud/i18n/server";
import "./globals.css";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  const messages = await getMessages();
  const timeZone = await getTimeZone();

  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body>
        <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
          <TimeZoneInit />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
