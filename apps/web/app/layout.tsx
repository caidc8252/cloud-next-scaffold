import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getEnv } from "@cloud/config";
import { LOCALE_COOKIE, defaultLocale, isLocale } from "@cloud/i18n";
import { NextIntlClientProvider, TimeZoneInit } from "@cloud/i18n/client";
import { ClientToaster } from "./_components/client-toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cloud Frontend Scaffold",
  description: "Scaffold with baseline admin shell, auth, and Prisma models.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const env = getEnv();

  // `<html lang>` 要反映实际 locale。不直接 import next-intl 的 getLocale，
  // 改用 @cloud/i18n 的 cookie 常量 + isLocale 自行收窄，与 request config 同源。
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return (
    <html lang={locale}>
      <body data-app-name={env.NEXT_PUBLIC_APP_NAME}>
        {/* 走 cookie 不走 URL 路由、且无 next-intl middleware，provider 无法自动推断 locale，
            需显式传；messages / timeZone / formats 仍由 server 端 request config 注入 */}
        <NextIntlClientProvider locale={locale}>
          <TimeZoneInit />
          {children}
          <ClientToaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
