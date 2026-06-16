import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Gauge,
  Globe,
  Layers,
  Mail,
  MapPin,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge, Button } from "@cloud/ui";
import { getTranslations } from "@cloud/i18n/server";
import { PepLogo } from "@/app/_components/brand";

const FEATURES: { key: string; Icon: LucideIcon }[] = [
  { key: "deviceFleet", Icon: Smartphone },
  { key: "firmware", Icon: Layers },
  { key: "merchants", Icon: Store },
  { key: "diagnostics", Icon: Gauge },
  { key: "geo", Icon: MapPin },
  { key: "alerts", Icon: Bell },
];

const BRAND_CARDS: { key: string; Icon: LucideIcon }[] = [
  { key: "domain", Icon: Globe },
  { key: "branding", Icon: Sparkles },
  { key: "sso", Icon: ShieldCheck },
];

const NAV_LINKS = ["platform", "devices", "pricing", "docs"] as const;

export default async function HomePage() {
  const t = await getTranslations("portal");

  return (
    <div className="pep-fade flex min-h-screen flex-col bg-surface-1">
      {/* top nav */}
      <nav className="sticky top-0 z-20 flex h-16 items-center gap-6 border-b border-line-subtle bg-surface-1/85 px-8 backdrop-blur">
        <PepLogo size={28} sub={t("brand.newland")} />
        <div className="ml-3 hidden gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <span
              key={l}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-content-secondary"
            >
              {t(`nav.${l}`)}
            </span>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2.5">
          <Button render={<Link href="/login" />} nativeButton={false} variant="ghost" size="sm">
            {t("nav.signIn")}
          </Button>
          <Button render={<Link href="/login" />} nativeButton={false} size="sm" iconRight={<ArrowRight size={15} />}>
            {t("nav.openConsole")}
          </Button>
        </div>
      </nav>

      {/* hero */}
      <header className="mx-auto w-full max-w-275 px-8 pb-16 pt-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line-default bg-surface-2 py-1.5 pl-2 pr-3 text-sm font-medium text-content-secondary shadow-1">
          <Badge tone="info" shape="pill" className="uppercase">
            {t("home.eyebrowTag")}
          </Badge>
          <span>{t("home.eyebrowText")}</span>
        </div>
        <h1 className="mx-auto mb-6 max-w-14ch text-5xl font-semibold leading-none tracking-tight text-balance sm:text-6xl">
          {t.rich("home.title", {
            em: (c) => <em className="not-italic text-primary-600">{c}</em>,
          })}
        </h1>
        <p className="mx-auto mb-8 max-w-56ch text-lg leading-relaxed text-content-secondary text-pretty">
          {t("home.sub")}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button render={<Link href="/login" />} nativeButton={false} size="lg" iconRight={<ArrowRight size={16} />}>
            {t("home.ctaSignIn")}
          </Button>
          <Button
            render={<Link href="/onboarding" />}
            nativeButton={false}
            variant="secondary"
            size="lg"
            iconLeft={<Mail size={16} />}
          >
            {t("home.ctaInvite")}
          </Button>
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-5 text-sm text-content-tertiary">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-success-500" aria-hidden />
            {t("home.metaUptime")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={14} /> {t("home.metaSso")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Globe size={14} /> {t("home.metaBrand")}
          </span>
        </div>
      </header>

      {/* core features */}
      <section className="mx-auto w-full max-w-295 px-8 pt-6">
        <div className="mb-7">
          <div className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-primary-600">
            {t("home.capabilitiesOverline")}
          </div>
          <h2 className="mb-2 text-3xl font-semibold tracking-tight">
            {t("home.capabilitiesTitle")}
          </h2>
          <p className="max-w-60ch text-content-secondary">{t("home.capabilitiesLede")}</p>
        </div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line-subtle bg-line-subtle sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ key, Icon }) => (
            <article key={key} className="bg-surface-2 p-6 transition-colors hover:bg-surface-3">
              <span className="mb-4 inline-flex size-10 items-center justify-center rounded-lg border border-primary-100 bg-primary-50 text-primary-700">
                <Icon size={20} />
              </span>
              <h3 className="mb-1.5 text-base font-semibold">{t(`home.features.${key}.title`)}</h3>
              <p className="text-sm leading-relaxed text-content-secondary text-pretty">
                {t(`home.features.${key}.desc`)}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* brand / identity strip */}
      <section className="mx-auto mt-12 w-full max-w-295 px-8">
        <div className="mb-7">
          <div className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-primary-600">
            {t("home.brandOverline")}
          </div>
          <h2 className="text-3xl font-semibold tracking-tight">{t("home.brandTitle")}</h2>
        </div>
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
          {BRAND_CARDS.map(({ key, Icon }) => (
            <div
              key={key}
              className="flex gap-3.5 rounded-xl border border-line-default bg-surface-2 p-5 shadow-2"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line-subtle bg-surface-3 text-content-secondary">
                <Icon size={18} />
              </span>
              <div>
                <h3 className="mb-1 text-sm font-semibold">{t(`home.brandStrip.${key}.title`)}</h3>
                <p className="text-xs leading-snug text-content-tertiary">
                  {t(`home.brandStrip.${key}.desc`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="mx-auto mt-16 w-full max-w-295 px-8">
        <div className="pep-cta-glow flex flex-wrap items-center justify-between gap-8 rounded-2xl bg-primary-700 p-11 text-white shadow-4">
          <div className="relative">
            <h2 className="mb-2 text-2xl font-semibold tracking-tight">{t("home.ctaBandTitle")}</h2>
            <p className="max-w-46ch text-sm text-white/85">{t("home.ctaBandText")}</p>
          </div>
          <div className="relative flex flex-wrap gap-3">
            <Button
              render={<Link href="/login" />}
              nativeButton={false}
              size="lg"
              variant="secondary"
              iconRight={<ArrowRight size={16} />}
              className="border-0 bg-white text-primary-800 hover:bg-white/90"
            >
              {t("home.ctaBandSignIn")}
            </Button>
            <Button
              render={<Link href="/onboarding" />}
              nativeButton={false}
              size="lg"
              variant="outline"
              className="border-white/25 bg-white/10 text-white hover:bg-white/20"
            >
              {t("home.ctaBandInvite")}
            </Button>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="mt-20 flex flex-wrap items-center justify-between gap-4 border-t border-line-subtle px-8 py-7">
        <div className="flex items-center gap-3">
          <PepLogo size={24} />
          <span className="text-xs text-content-tertiary">
            {t("home.footerCopyright", { by: t("brand.by") })}
          </span>
        </div>
        <div className="flex gap-5 text-xs text-content-tertiary">
          <span>{t("home.footerStatus")}</span>
          <span>{t("home.footerSecurity")}</span>
          <span>{t("home.footerPrivacy")}</span>
          <span>{t("home.footerTerms")}</span>
          <Link href="/broken-link-demo" className="hover:text-content-primary">
            {t("home.footerBrokenLink")}
          </Link>
        </div>
      </footer>
    </div>
  );
}
