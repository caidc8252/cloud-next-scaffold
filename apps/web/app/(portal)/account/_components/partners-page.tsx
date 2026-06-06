"use client";

import { useState } from "react";
import { Building2, Check, ExternalLink, Lock } from "lucide-react";
import { Button, Modal, toast } from "@cloud/ui/components/ui";
import { cn } from "@cloud/ui";
import { useTranslations, useLocale } from "@cloud/i18n/client";
import type { Partner } from "@/app/(portal)/account/_shared/types";
import { UPHeader } from "./up-chrome";

export function PartnersPageClient({ initialPartners }: { initialPartners: Partner[] }) {
  const t = useTranslations("account");
  const locale = useLocale();
  const [jump, setJump] = useState<Partner | null>(null);

  const portalCount = new Set(initialPartners.map((p) => p.portalKey)).size;
  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(new Date(iso));

  function onSwitch(p: Partner) {
    if (p.locked) {
      toast.error(t("partners.toast.locked", { name: p.name }));
      return;
    }
    if (p.current) {
      toast(t("partners.toast.current", { portal: p.portalLabel }));
      return;
    }
    setJump(p);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <UPHeader
        icon={<Building2 size={20} />}
        title={t("partners.title")}
        sub={t("partners.sub", { count: initialPartners.length, portals: portalCount })}
      />

      <div className="flex flex-col gap-2.5">
        {initialPartners.map((p) => (
          <button
            key={p.eurId}
            type="button"
            onClick={() => onSwitch(p)}
            className={cn(
              "flex w-full cursor-pointer items-center gap-3.5 rounded-xl border bg-surface-2 px-4 py-3.5 text-left transition-colors hover:border-line-strong",
              p.current ? "border-primary/40" : "border-line-default",
              p.locked && "opacity-70",
            )}
          >
            <div
              className="flex size-10 flex-none items-center justify-center rounded-lg font-semibold text-white"
              style={{ background: p.portalTint }}
            >
              {p.initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-semibold text-content-primary">{p.name}</span>
                <span className="flex flex-wrap gap-1">
                  {p.kinds.length === 0 ? (
                    <span className="rounded border border-line-subtle bg-surface-3 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-content-tertiary">
                      {t("partners.noContract")}
                    </span>
                  ) : (
                    p.kinds.map((k) => (
                      <span
                        key={k}
                        className="rounded border border-line-subtle bg-surface-3 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-content-secondary"
                      >
                        {k}
                      </span>
                    ))
                  )}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-content-tertiary">
                <span className="inline-flex items-center gap-1">
                  {p.current ? <Building2 size={13} /> : <ExternalLink size={13} />}
                  {p.portalLabel}
                </span>
                <span>·</span>
                <span>{t("partners.joined", { date: fmtDate(p.joinedAt) })}</span>
                <span>·</span>
                <span>{p.authType === "ADMIN" ? t("partners.adminAccess") : t("partners.roleAccess")}</span>
                {p.locked && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 text-error-strong">
                      <Lock size={11} />
                      {t("partners.locked")}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex-none text-content-tertiary">
              {p.current ? (
                <Check size={18} className="text-primary" />
              ) : p.locked ? (
                <Lock size={15} />
              ) : (
                <ExternalLink size={15} />
              )}
            </div>
          </button>
        ))}
      </div>

      <Modal
        open={!!jump}
        onClose={() => setJump(null)}
        size="sm"
        title={
          <span className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ExternalLink size={18} />
            </span>
            {jump ? t("partners.confirm.title", { name: jump.name, portal: jump.portalLabel }) : ""}
          </span>
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setJump(null)}>
              {t("partners.confirm.stay")}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (jump) toast(t("partners.toast.opening", { portal: jump.portalLabel, name: jump.name }));
                setJump(null);
              }}
            >
              {t("partners.confirm.leave")}
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-content-secondary">
          {jump ? t("partners.confirm.body", { portal: jump.portalLabel }) : ""}
        </p>
      </Modal>
    </div>
  );
}
