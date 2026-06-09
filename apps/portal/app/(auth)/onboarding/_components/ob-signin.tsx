"use client";

import { useState } from "react";
import { Check, Lock, Mail } from "lucide-react";
import { Button, Field, Input } from "@cloud/ui";
import { request } from "@cloud/request/client";
import { useTranslations } from "@cloud/i18n/client";
import type { Account, Invitation } from "@/lib/mock/types";
import { AuthLead, BackLink } from "@/app/(auth)/_components/card-bits";
import { ObCard } from "./ob-bits";

export function ObSignin({
  invitation,
  onBack,
  onSignedIn,
}: {
  invitation: Invitation;
  onBack: () => void;
  onSignedIn: (account: Account) => void;
}) {
  const t = useTranslations("portal.onboarding.signin");
  const tob = useTranslations("portal.onboarding");
  const [email, setEmail] = useState(invitation.email);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = email.includes("@") && pw.length >= 6;

  async function submit() {
    if (!valid) return;
    setBusy(true);
    try {
      const res = await request.post<{ account: Account }>("/api/onboarding/signin", {
        token: invitation.token,
        email,
        password: pw,
      });
      onSignedIn(res.data.account);
    } catch {
      setBusy(false);
    }
  }

  return (
    <ObCard>
      <BackLink onClick={onBack}>{tob("back")}</BackLink>
      <AuthLead
        eyebrow={t("step")}
        title={t("title")}
        sub={t.rich("sub", { partner: invitation.partner, b: (c) => <strong>{c}</strong> })}
      />
      <div className="flex flex-col gap-3.5">
        <Field htmlFor="ob-email" label={t("emailLabel")}>
          <Input
            id="ob-email"
            type="email"
            value={email}
            prefix={<Mail size={14} />}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field htmlFor="ob-pw" label={t("passwordLabel")} hint={t("passwordHint")}>
          <Input
            id="ob-pw"
            type="password"
            value={pw}
            placeholder="••••••••"
            prefix={<Lock size={14} />}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </Field>
      </div>
      <div className="mt-5 flex justify-end gap-2.5">
        <Button variant="ghost" onClick={onBack}>
          {tob("cancel")}
        </Button>
        <Button loading={busy} iconLeft={busy ? undefined : <Check size={15} />} disabled={!valid} onClick={submit}>
          {busy ? t("signingIn") : t("signIn")}
        </Button>
      </div>
    </ObCard>
  );
}
