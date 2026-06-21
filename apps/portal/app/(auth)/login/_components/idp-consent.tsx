"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Lock, User } from "lucide-react";
import { Avatar, AvatarFallback, Button } from "@cloud/ui";
import { getIdpAccounts } from "@/service/auth/api";
import { useTranslations } from "@cloud/i18n/client";
import type { Account, IdpAccount, ProviderId, SsoTenant } from "@/lib/mock/types";
import { initials } from "@/lib/format";
import { ProviderMark, PROVIDERS } from "@/app/_components/provider-mark";

function AccountRow({
  name,
  email,
  accent,
  onClick,
}: {
  name: string;
  email: string;
  accent?: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      block
      size="auto"
      onClick={onClick}
      className="justify-start gap-3 px-3 py-2.5 font-normal"
    >
      <Avatar size="md">
        <AvatarFallback
          className="text-xs font-semibold text-white"
          style={accent ? { background: accent } : undefined}
        >
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <span className="flex flex-1 flex-col items-start text-left">
        <span className="text-sm font-semibold">{name}</span>
        <span className="text-xs text-content-tertiary">{email}</span>
      </span>
      <ChevronRight size={15} className="text-content-tertiary" />
    </Button>
  );
}

export function IdpConsent({
  provider,
  tenant,
  account,
  onChoose,
  onCancel,
}: {
  provider: ProviderId;
  tenant: SsoTenant | null;
  account: Account | null;
  onChoose: (account: { name: string; email: string; sub: string }) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("portal.login.idp");
  const [accounts, setAccounts] = useState<IdpAccount[]>([]);
  const p = PROVIDERS[provider];

  useEffect(() => {
    if (tenant) return; // enterprise: single account passed in
    getIdpAccounts(provider)
      .then((res) => setAccounts(res.data.accounts))
      .catch(() => setAccounts([]));
  }, [provider, tenant]);

  const target = tenant ? t("targetPartner", { partner: tenant.partner }) : t("targetConsole");
  const rows: IdpAccount[] =
    tenant && account ? [{ name: account.name, email: account.email, sub: account.sub ?? "" }] : accounts;

  return (
    <div className="overflow-hidden rounded-2xl border border-line-default bg-surface-2 shadow-3">
      <div className="flex items-center gap-2.5 border-b border-line-subtle bg-surface-3 px-4 py-3">
        <ProviderMark id={provider} size={20} />
        <span className="flex-1 font-mono text-xs text-content-secondary">{p.sub}</span>
        <span className="inline-flex items-center gap-1 text-xs text-success-strong">
          <Lock size={11} /> {t("secure")}
        </span>
      </div>
      <div className="px-7 pb-6 pt-7">
        <div className="text-lg font-semibold tracking-tight">
          {tenant ? t("signIn") : t("chooseAccount")}
        </div>
        <div className="mb-5 mt-1 text-sm text-content-secondary">
          {t.rich("continueTo", {
            target,
            b: (c) => <strong className="font-semibold text-content-primary">{c}</strong>,
          })}
        </div>
        <div className="flex flex-col gap-2">
          {rows.map((a) => (
            <AccountRow
              key={a.sub || a.email}
              name={a.name}
              email={a.email}
              accent={tenant?.accent}
              onClick={() => onChoose(a)}
            />
          ))}
          {!tenant && rows.length > 0 ? (
            <Button
              variant="outline"
              block
              size="auto"
              onClick={() => onChoose(rows[0])}
              className="justify-start gap-3 border-dashed px-3 py-2.5 font-normal"
            >
              <Avatar size="md">
                <AvatarFallback className="bg-surface-3 text-content-tertiary">
                  <User size={16} />
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-semibold">{t("useAnother")}</span>
            </Button>
          ) : null}
        </div>
        <p className="mt-5 text-xs leading-relaxed text-content-tertiary">
          {t.rich("consent", {
            provider: p.label,
            b: (c) => <strong className="font-semibold text-content-secondary">{c}</strong>,
          })}
        </p>
        <div className="mt-3.5">
          <Button variant="link" onClick={onCancel} className="text-sm">
            {t("cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}
