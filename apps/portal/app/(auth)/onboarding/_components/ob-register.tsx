"use client";

import { useState } from "react";
import { Check, Lock, Mail, User } from "lucide-react";
import {
  Button,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cloud/ui";
import { RequestError } from "@cloud/request/client";
import { getLoginChallenge } from "@/service/auth/api";
import { acceptOnboarding } from "@/service/onboarding/api";
import { useTranslations } from "@cloud/i18n/client";
import { isPasswordValid, PW_MIN } from "@/lib/password-rules";
import { encryptLoginPassword } from "@/lib/login-crypto";
import { COUNTRIES } from "@/lib/countries";
import { initials } from "@/lib/format";
import { AuthLead, BackLink, ErrorBanner } from "@/app/(auth)/_components/card-bits";
import { PasswordChecklist } from "@/app/(auth)/_components/password-checklist";
import { EntRow, ObCard } from "./ob-bits";
import type { InvitePublic } from "./types";

// 新建账号入驻：用被邀邮箱（固定）+ 名字 + 国家 + 密码（RSA 加密）。提交即 accept(register) → 进 console。
export function ObRegister({
  invite,
  token,
  onBack,
}: {
  invite: InvitePublic;
  token: string;
  onBack: () => void;
}) {
  const t = useTranslations("portal.onboarding.register");
  const tob = useTranslations("portal.onboarding");
  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState("US");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const pwMatch = pw.length > 0 && pw === confirm;
  const valid = displayName.trim().length > 0 && isPasswordValid(pw) && pwMatch;

  async function submit() {
    if (!valid) return;
    setErr("");
    setBusy(true);
    try {
      const ch = await getLoginChallenge();
      const encryptedPassword = await encryptLoginPassword(pw, ch.data.serverTimestamp, ch.data.nonce);
      const res = await acceptOnboarding({
        mode: "register",
        token,
        encryptedPassword,
        displayName: displayName.trim(),
        country,
      });
      window.location.assign(res.data.redirectTo);
    } catch (e) {
      setErr(e instanceof RequestError ? (e.body?.message ?? t("error")) : t("error"));
      setBusy(false);
    }
  }

  return (
    <ObCard>
      <BackLink onClick={onBack}>{tob("back")}</BackLink>
      <AuthLead title={t("title")} sub={t("emailNote", { email: invite.inviteEmail })} />
      <div className="mb-4">
        <EntRow
          initials={initials(invite.partyName)}
          name={invite.partyName}
          sub={
            <span className="flex items-center gap-1.5">
              <Mail size={12} /> {invite.inviteEmail}
            </span>
          }
        />
      </div>
      <div className="flex flex-col gap-3.5">
        <Field htmlFor="ob-display" label={t("displayLabel")} required>
          <Input
            id="ob-display"
            value={displayName}
            autoFocus
            prefix={<User size={14} />}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </Field>
        <Field label={t("countryLabel")} required>
          <Select value={country} onValueChange={(v) => setCountry(v as string)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field htmlFor="ob-pw" label={t("passwordLabel")} required>
          <Input
            id="ob-pw"
            type="password"
            value={pw}
            placeholder={`${PW_MIN}+`}
            prefix={<Lock size={14} />}
            onChange={(e) => setPw(e.target.value)}
          />
        </Field>
        <Field
          htmlFor="ob-confirm"
          label={t("confirmLabel")}
          required
          error={confirm && !pwMatch ? t("mismatch") : undefined}
        >
          <Input
            id="ob-confirm"
            type="password"
            value={confirm}
            placeholder={t("confirmPlaceholder")}
            prefix={<Lock size={14} />}
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </Field>
        <PasswordChecklist password={pw} />
        {err ? <ErrorBanner>{err}</ErrorBanner> : null}
      </div>
      <Button
        block
        className="mt-4"
        loading={busy}
        iconLeft={busy ? undefined : <Check size={15} />}
        disabled={!valid}
        onClick={submit}
      >
        {busy ? t("submitting") : t("submit")}
      </Button>
    </ObCard>
  );
}
