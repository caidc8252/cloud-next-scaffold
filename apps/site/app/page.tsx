import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, Boxes, Cloud, ShieldCheck } from "lucide-react";
import { getTranslations } from "@cloud/i18n/server";

const LOGIN_URL = "/login";

const capabilityKeys = ["auth", "permissions", "storage"] as const;
const capabilityIcons = {
  auth: ShieldCheck,
  permissions: Boxes,
  storage: Cloud,
} satisfies Record<(typeof capabilityKeys)[number], typeof ShieldCheck>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("site.metadata");

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function HomePage() {
  const t = await getTranslations("site.home");

  return (
    <main>
      <section className="hero-section">
        <Image src="/portal-hero.png" alt="" fill priority sizes="100vw" className="hero-image" />
        <div className="hero-scrim" />
        <header className="site-header" aria-label={t("brand")}>
          <a className="brand-link" href="#top">
            {t("brand")}
          </a>
          <a className="login-link" href={LOGIN_URL}>
            <span>{t("login")}</span>
            <ArrowRight size={17} aria-hidden="true" />
          </a>
        </header>
        <div id="top" className="hero-content">
          <p className="hero-eyebrow">{t("heroEyebrow")}</p>
          <h1>{t("heroTitle")}</h1>
          <p className="hero-copy">{t("heroDescription")}</p>
          <div className="hero-actions">
            <a className="primary-action" href={LOGIN_URL}>
              <span>{t("primaryAction")}</span>
              <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a className="secondary-action" href="#capabilities">
              {t("secondaryAction")}
            </a>
          </div>
        </div>
      </section>

      <section className="metric-band" aria-label={t("capabilitiesTitle")}>
        <div className="metric-grid">
          <Metric value={t("metrics.apps.value")} label={t("metrics.apps.label")} />
          <Metric value={t("metrics.auth.value")} label={t("metrics.auth.label")} />
          <Metric value={t("metrics.ops.value")} label={t("metrics.ops.label")} />
        </div>
      </section>

      <section id="capabilities" className="capability-section">
        <div className="section-heading">
          <h2>{t("capabilitiesTitle")}</h2>
          <p>{t("capabilitiesDescription")}</p>
        </div>
        <div className="capability-grid">
          {capabilityKeys.map((key) => {
            const Icon = capabilityIcons[key];

            return (
              <article className="capability-card" key={key}>
                <Icon size={24} aria-hidden="true" />
                <h3>{t(`capabilities.${key}.title`)}</h3>
                <p>{t(`capabilities.${key}.description`)}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="metric-item">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
