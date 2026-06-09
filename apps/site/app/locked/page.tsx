import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "@cloud/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("site.locked.metadata");

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LockedPage() {
  const t = await getTranslations("site.locked");

  return (
    <main className="site-login-screen">
      <div className="site-login-shell">
        <section className="site-placeholder-panel">
          <p className="site-login-eyebrow">{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p>{t("description")}</p>
          <Link className="secondary-action" href="/login">
            {t("back")}
          </Link>
        </section>
      </div>
    </main>
  );
}
