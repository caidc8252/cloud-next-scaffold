import { getTranslations } from "@cloud/i18n/server";

// customer 平台首页骨架。后续业务页落 app/(console) 等分组、取数走 service/<domain>，
// 鉴权用 requireSession / requirePermissions，接口落 app/api/*（只做 HTTP 适配）。
export default async function Home() {
  const t = await getTranslations("customer");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-10 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="max-w-[48ch] text-content-secondary">{t("welcome")}</p>
    </main>
  );
}
