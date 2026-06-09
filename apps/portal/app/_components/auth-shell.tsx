"use client";

import type { ReactNode } from "react";
import { CreditCard, Gauge, Settings, Smartphone, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Spinner } from "@cloud/ui";
import { useTranslations } from "@cloud/i18n/client";
import { PepLogo } from "./brand";

const HIGHLIGHTS: { key: string; Icon: LucideIcon }[] = [
  { key: "devices", Icon: Smartphone },
  { key: "diagnostics", Icon: Gauge },
  { key: "parameters", Icon: Settings },
  { key: "merchants", Icon: Store },
  { key: "receipts", Icon: CreditCard },
];

function BrandPanel() {
  const t = useTranslations("portal.login.brand");
  return (
    <aside className="pep-brand-panel relative hidden w-[46%] max-w-[620px] flex-col overflow-hidden p-12 text-white lg:flex">
      <div className="relative flex items-center justify-between">
        <PepLogo size={30} sub={t("sub")} onDark />
      </div>
      <div className="relative flex max-w-[460px] flex-1 flex-col justify-center gap-7">
        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-balance">
          {t.rich("lead", { em: (c) => <em className="not-italic text-primary-300">{c}</em> })}
        </h2>
        <ul className="flex flex-col gap-4">
          {HIGHLIGHTS.map(({ key, Icon }) => (
            <li key={key} className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/10 text-primary-300">
                <Icon size={16} />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold text-white/95">{t(`highlights.${key}.title`)}</span>
                <span className="mt-0.5 text-xs leading-snug text-white/70">{t(`highlights.${key}.desc`)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="relative flex items-center gap-2 text-xs text-white/65">
        <span className="size-2 rounded-full bg-success-500" aria-hidden />
        {t("status")}
      </div>
    </aside>
  );
}

export function AuthShell({
  children,
  busy,
  showBrand = false,
}: {
  children: ReactNode;
  busy?: string | null;
  showBrand?: boolean;
}) {
  const t = useTranslations("portal.login");
  return (
    <div className="pep-fade flex min-h-screen">
      {showBrand ? <BrandPanel /> : null}
      <div className="relative flex flex-1 items-center justify-center bg-surface-1 p-6 sm:p-10">
        <div className="w-full max-w-[420px]">{children}</div>
        {busy ? (
          <div
            role="status"
            aria-live="polite"
            className="pep-busy-overlay absolute inset-0 z-10 flex flex-col items-center justify-center gap-3.5"
          >
            <Spinner size="xl" />
            <span className="text-sm font-medium text-content-secondary">{busy}</span>
            <span className="sr-only">{t("processing")}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
