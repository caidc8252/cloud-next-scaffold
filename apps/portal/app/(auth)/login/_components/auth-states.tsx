"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Building2, Clock, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@cloud/ui";
import { useTranslations } from "@cloud/i18n/client";
import type { Account, AuthBlockType } from "@/lib/mock/types";
import { AccountChip } from "@/app/_components/account-chip";
import { AuthLead, IconBadge } from "@/app/(auth)/_components/card-bits";

const mmss = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function AuthBlocked({ type, onBack }: { type: AuthBlockType; onBack: () => void }) {
  const t = useTranslations("portal.login.blocked");
  const isRate = type === "ratelimit";
  const [left, setLeft] = useState(isRate ? 3600 : 0);

  useEffect(() => {
    if (!isRate) return;
    const id = setInterval(() => setLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [isRate]);

  const icon = type === "ratelimit" ? <Clock size={24} /> : type === "mfa" ? <ShieldCheck size={24} /> : <Lock size={24} />;
  const tone = type === "ratelimit" ? "warning" : "error";

  return (
    <div className="flex flex-col items-center text-center">
      <AuthLead
        centered
        crest={<IconBadge tone={tone} size={52}>{icon}</IconBadge>}
        eyebrow={t(`${type}.eyebrow`)}
        title={t(`${type}.title`)}
        sub={t(`${type}.body`)}
      />
      {isRate ? (
        <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-line-default bg-surface-3 px-3.5 py-2 text-sm text-content-secondary">
          <Clock size={14} />
          <span className="font-mono font-semibold text-content-primary">
            {left > 0 ? mmss(left) : t("ratelimit.ready")}
          </span>
          {left > 0 ? <span className="text-xs text-content-tertiary">{t("ratelimit.until")}</span> : null}
        </div>
      ) : null}
      <div className="mt-5 flex flex-col items-center gap-2.5">
        {isRate ? (
          <Button iconRight={<ArrowRight size={15} />} disabled={left > 0} onClick={onBack}>
            {t("ratelimit.tryAgain")}
          </Button>
        ) : (
          <Button iconLeft={<Mail size={15} />} onClick={onBack}>
            {t(`${type}.contact`)}
          </Button>
        )}
        <Button variant="ghost" onClick={onBack}>
          {t("back")}
        </Button>
      </div>
    </div>
  );
}

export function NoCompany({
  account,
  onBack,
  onInvite,
}: {
  account: Account | null;
  onBack: () => void;
  onInvite: () => void;
}) {
  const t = useTranslations("portal.login.nocompany");
  return (
    <div className="flex flex-col items-center text-center">
      <AuthLead
        centered
        crest={
          <IconBadge size={52}>
            <Building2 size={24} />
          </IconBadge>
        }
        eyebrow={t("eyebrow")}
        title={t("title")}
        sub={t("body")}
      />
      {account ? (
        <div className="mt-1">
          <AccountChip name={account.name} email={account.email} />
        </div>
      ) : null}
      <div className="mt-5 flex flex-col items-center gap-2.5">
        <Button iconLeft={<Mail size={15} />} onClick={onInvite}>
          {t("haveInvite")}
        </Button>
        <Button variant="ghost" onClick={onBack}>
          {t("back")}
        </Button>
      </div>
    </div>
  );
}
