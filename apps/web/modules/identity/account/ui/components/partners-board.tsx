"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ExternalLink, Lock } from "lucide-react";
import { Button, Modal, toast } from "@cloud/ui/components/ui";
import { cn } from "@cloud/ui";
import { toastError } from "@cloud/request/error-toast";
import { useTranslations, useLocale } from "@cloud/i18n/client";
import { selectPartner } from "@/service/auth/api";
import type { AccountPartner } from "@/app/(dashboard)/account/_shared/types";
import { useNotifications } from "@/app/(dashboard)/_components/notifications-provider";
import { UPHeader } from "./up-chrome";

export function PartnersPageClient({ initialPartners }: { initialPartners: AccountPartner[] }) {
  const t = useTranslations("account");
  const locale = useLocale();
  const router = useRouter();
  const { unreadByParty } = useNotifications();
  const [pending, setPending] = useState<AccountPartner | null>(null);
  const [busy, setBusy] = useState(false);

  const fmtDate = (iso: string | null) =>
    iso ? new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(new Date(iso)) : "—";
  const initialOf = (name: string) => (name.trim().charAt(0) || "?").toUpperCase();

  function onSelect(p: AccountPartner) {
    if (p.locked) return void toast.error(t("partners.toast.locked", { name: p.partyName }));
    if (p.isCurrent) return void toast(t("partners.toast.current", { name: p.partyName }));
    setPending(p);
  }

  async function confirmSwitch() {
    if (!pending) return;
    setBusy(true);
    try {
      await selectPartner({ partyId: pending.partyId });
      router.replace("/");
      router.refresh();
    } catch (err) {
      toastError(err);
      setBusy(false);
      setPending(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <UPHeader
        icon={<Building2 size={20} />}
        title={t("partners.title")}
        sub={t("partners.sub", { count: initialPartners.length })}
      />

      <div className="flex flex-col gap-2.5">
        {initialPartners.map((p) => (
          <Button
            key={p.partyUserId}
            variant="ghost"
            size="auto"
            onClick={() => onSelect(p)}
            className={cn(
              "flex w-full cursor-pointer items-center gap-3.5 rounded-xl border bg-surface-2 px-4 py-3.5 text-left transition-colors hover:border-line-strong",
              p.isCurrent ? "border-primary/40" : "border-line-default",
              p.locked && "opacity-70",
            )}
          >
            <div className="flex size-10 flex-none items-center justify-center rounded-lg bg-primary/10 text-md font-semibold text-primary">
              {initialOf(p.partyName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-md font-semibold text-content-primary">{p.partyName}</span>
                <span className="flex flex-wrap gap-1">
                  {p.contractTypes.length === 0 ? (
                    <span className="rounded border border-line-subtle bg-surface-3 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-content-tertiary">
                      {t("partners.noContract")}
                    </span>
                  ) : (
                    p.contractTypes.map((k) => (
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
                <span>{t("partners.joined", { date: fmtDate(p.authorizingTimestamp) })}</span>
                <span>·</span>
                <span>{p.authorizingType === "ADMIN" ? t("partners.adminAccess") : t("partners.roleAccess")}</span>
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
            {(unreadByParty[p.partyId] ?? 0) > 0 && (
              <span className="grid min-w-5 place-items-center rounded-full bg-error px-1.5 text-2xs font-semibold leading-5 text-content-inverse">
                {(unreadByParty[p.partyId] ?? 0) > 99 ? "99+" : unreadByParty[p.partyId]}
              </span>
            )}
            <div className="flex-none text-content-tertiary">
              {p.isCurrent ? (
                <Check size={18} className="text-primary" />
              ) : p.locked ? (
                <Lock size={15} />
              ) : (
                <ExternalLink size={15} />
              )}
            </div>
          </Button>
        ))}
      </div>

      <Modal
        open={!!pending}
        onClose={() => !busy && setPending(null)}
        size="sm"
        title={pending ? t("partners.confirm.title", { name: pending.partyName }) : ""}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPending(null)} disabled={busy}>
              {t("partners.confirm.stay")}
            </Button>
            <Button variant="primary" onClick={confirmSwitch} loading={busy}>
              {t("partners.confirm.leave")}
            </Button>
          </div>
        }
      >
        <p className="text-md leading-relaxed text-content-secondary">
          {pending ? t("partners.confirm.body", { name: pending.partyName }) : ""}
        </p>
      </Modal>
    </div>
  );
}
