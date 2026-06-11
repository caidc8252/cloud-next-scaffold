import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, defaultLocale, isLocale } from "@cloud/i18n";
import { NextIntlClientProvider, TimeZoneInit } from "@cloud/i18n/client";
import { getMessages, getTimeZone } from "@cloud/i18n/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "PEP · Customer Console",
  description: "Customer console for Newland Payment Empowerment Platform.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // 走 cookie 不走 URL 路由，provider 无法自动推断 locale，需显式收窄并下传（同 admin / portal）。
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  const messages = await getMessages();
  const timeZone = await getTimeZone();

  return (
    <html lang={locale}>
      <body className="bg-surface-1 text-content-primary antialiased">
        <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
          <TimeZoneInit />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
