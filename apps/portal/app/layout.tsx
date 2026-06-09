import type { Metadata } from "next";
import { cookies } from "next/headers";
// getMessages isn't re-exported by @cloud/i18n/server yet; the no-restricted
// rule explicitly permits getMessages/getTranslations from next-intl/server in
// Server Components (its over-broad glob just can't express the carve-out).
// eslint-disable-next-line no-restricted-imports
import { getMessages } from "next-intl/server";
import { LOCALE_COOKIE, defaultLocale, isLocale } from "@cloud/i18n";
import { NextIntlClientProvider, TimeZoneInit } from "@cloud/i18n/client";
import "./globals.css";

export const metadata: Metadata = {
  title: "PEP · Payment Empowerment Platform",
  description: "Partner console for Newland Payment Technology — provision devices, push firmware and apps, onboard merchants.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // 走 cookie 不走 URL 路由、无 next-intl middleware，provider 无法自动推断 locale，
  // 需用 @cloud/i18n 的 cookie 常量 + isLocale 自行收窄并显式下传。
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  // Client Components 不自动继承 messages，需从 request config 显式取出下传。
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="bg-surface-1 text-content-primary antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <TimeZoneInit />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
