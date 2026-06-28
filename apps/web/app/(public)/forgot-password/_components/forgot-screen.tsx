"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Mail } from "lucide-react";
import { Button, Field, Input } from "@cloud/ui";
import { RequestError } from "@cloud/request/client";
import { sendResetLink } from "@/modules/identity/forgot-password/client/forgot.api";
import { useTranslations } from "@cloud/i18n/client";
import { PepMark } from "@/app/_components/brand";
import { AuthShell } from "@/app/_components/auth-shell";
import { AuthLead, BackLink, ErrorBanner, IconBadge } from "@/app/(public)/_components/card-bits";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Stage = "email" | "sent";

// 找回密码（自助触发）：输邮箱 → 发重置链接 → 提示去查邮件。设新密码在 /reset-password?token= 页。
export function ForgotScreen() {
  const t = useTranslations("portal.forgot");
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const emailValid = EMAIL_RE.test(email.trim());

  async function sendLink() {
    if (!emailValid) return setErr(t("email.err"));
    setErr("");
    setBusy(true);
    try {
      // 防枚举：后端无论邮箱是否存在都返回 ok。
      await sendResetLink({ email: email.trim() });
      setStage("sent");
    } catch (e) {
      setErr(e instanceof RequestError ? (e.body?.message ?? t("email.err")) : t("email.err"));
    } finally {
      setBusy(false);
    }
  }

  const body =
    stage === "email" ? (
      <div>
        <BackLink onClick={() => router.push("/login")}>{t("back")}</BackLink>
        <AuthLead crest={<PepMark size={36} />} eyebrow={t("email.eyebrow")} title={t("email.title")} sub={t("email.sub")} />
        <div className="flex flex-col gap-3.5">
          <Field htmlFor="fp-email" label={t("email.label")}>
            <Input
              id="fp-email"
              type="email"
              value={email}
              autoFocus
              placeholder="name@company.com"
              prefix={<Mail size={14} />}
              onChange={(e) => {
                setEmail(e.target.value);
                setErr("");
              }}
              onKeyDown={(e) => e.key === "Enter" && sendLink()}
            />
          </Field>
          {err ? <ErrorBanner>{err}</ErrorBanner> : null}
        </div>
        <Button
          block
          className="mt-4"
          loading={busy}
          iconRight={busy ? undefined : <ArrowRight size={15} />}
          disabled={!emailValid}
          onClick={sendLink}
        >
          {busy ? t("email.sending") : t("email.send")}
        </Button>
      </div>
    ) : (
      <div className="flex flex-col items-center text-center">
        <AuthLead
          centered
          crest={
            <IconBadge tone="success" size={52}>
              <Check size={26} />
            </IconBadge>
          }
          title={t("sent.title")}
          sub={t("sent.sub", { email: email.trim() })}
        />
        <Button className="mt-5" iconRight={<ArrowRight size={15} />} onClick={() => router.push("/login")}>
          {t("back")}
        </Button>
      </div>
    );

  return <AuthShell showBrand>{body}</AuthShell>;
}
