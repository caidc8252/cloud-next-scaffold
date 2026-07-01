"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Info, ShieldCheck, Smartphone } from "lucide-react";
import { Button, Field, Input } from "@cloud/ui";
import { useTranslations } from "@cloud/i18n/client";
import type { Account, MfaProfile } from "@/lib/auth-ui-types";
import { AccountChip } from "@/app/_components/account-chip";
import { AuthLead, BackLink, IconBadge } from "@/app/(portal)/_components/card-bits";

export function MfaChallenge({
  account,
  mfa,
  error,
  onVerify,
  onCancel,
}: {
  account: Account | null;
  mfa?: MfaProfile;
  error: string | null;
  onVerify: (code: string) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("portal.login.mfa");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const isSms = mfa?.method === "sms";

  useEffect(() => {
    if (!cooldown) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  return (
    <div>
      <BackLink onClick={onCancel}>{t("back")}</BackLink>
      <AuthLead
        crest={<IconBadge>{isSms ? <Smartphone size={20} /> : <ShieldCheck size={20} />}</IconBadge>}
        eyebrow={t("eyebrow")}
        title={t("title")}
        sub={
          isSms
            ? t.rich("subSms", { hint: mfa?.hint ?? "", b: (c) => <strong>{c}</strong> })
            : t.rich("subTotp", {
                hint: mfa?.hint ?? "authenticator app",
                b: (c) => <strong>{c}</strong>,
              })
        }
      />
      <div className="mb-4">
        <AccountChip name={account?.name} email={account?.email} />
      </div>
      <Field
        htmlFor="mfa-code"
        label={t("codeLabel")}
        error={error ?? undefined}
        hint={error ? undefined : t("hintDemo")}
      >
        <Input
          id="mfa-code"
          value={code}
          placeholder="000000"
          maxLength={6}
          autoFocus
          inputMode="numeric"
          className="pep-otp-input"
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && code.length === 6) onVerify(code);
          }}
        />
      </Field>
      <div className="mt-3">
        {isSms ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={!!cooldown}
            onClick={() => !cooldown && setCooldown(30)}
          >
            {cooldown ? t("resendIn", { seconds: cooldown }) : t("resend")}
          </Button>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-content-tertiary">
            <Info size={11} /> {t("refresh")}
          </span>
        )}
      </div>
      <Button
        block
        className="mt-4"
        iconRight={<ArrowRight size={15} />}
        disabled={code.length !== 6}
        onClick={() => onVerify(code)}
      >
        {t("verify")}
      </Button>
    </div>
  );
}
