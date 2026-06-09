"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Lock, Mail } from "lucide-react";
import { Button, Field, Input } from "@cloud/ui";
import { request } from "@cloud/request/client";
import { useTranslations } from "@cloud/i18n/client";
import { isPasswordValid, PW_MIN } from "@/lib/password-rules";
import { PepMark } from "@/app/_components/brand";
import { AuthShell } from "@/app/_components/auth-shell";
import { AuthLead, BackLink, ErrorBanner, IconBadge } from "@/app/(auth)/_components/card-bits";
import { PasswordChecklist } from "@/app/(auth)/_components/password-checklist";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Stage = "email" | "code" | "reset" | "done";

export function ForgotScreen() {
  const t = useTranslations("portal.forgot");
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!cooldown) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const emailValid = EMAIL_RE.test(email.trim());
  const codeValid = /^\d{6}$/.test(code.trim());
  const pwMatch = pw.length > 0 && pw === confirm;
  const pwValid = isPasswordValid(pw) && pwMatch;

  async function sendCode() {
    if (!emailValid) return setErr(t("email.err"));
    setErr("");
    setBusy(true);
    try {
      await request.post("/api/forgot-password/send-code", { email: email.trim() });
      setStage("code");
      setCooldown(30);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (!codeValid) return setErr(t("code.err"));
    setErr("");
    setBusy(true);
    try {
      await request.post("/api/forgot-password/verify-code", { email: email.trim(), code: code.trim() });
      setStage("reset");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!pwValid) return;
    setBusy(true);
    try {
      await request.post("/api/forgot-password/reset", { email: email.trim(), code: code.trim(), password: pw });
      setStage("done");
    } finally {
      setBusy(false);
    }
  }

  let body;
  if (stage === "email") {
    body = (
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
              onKeyDown={(e) => e.key === "Enter" && sendCode()}
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
          onClick={sendCode}
        >
          {busy ? t("email.sending") : t("email.send")}
        </Button>
      </div>
    );
  } else if (stage === "code") {
    body = (
      <div>
        <BackLink onClick={() => setStage("email")}>{t("changeEmail")}</BackLink>
        <AuthLead
          crest={<PepMark size={36} />}
          eyebrow={t("code.eyebrow")}
          title={t("code.title")}
          sub={t.rich("code.sub", { email, b: (c) => <strong>{c}</strong> })}
        />
        <Field
          htmlFor="fp-code"
          label={t("code.label")}
          hint={t.rich("code.hint", { code: (c) => <code className="rounded bg-surface-3 px-1 font-mono">{c}</code> })}
        >
          <Input
            id="fp-code"
            value={code}
            placeholder="123456"
            maxLength={6}
            autoFocus
            inputMode="numeric"
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
              setErr("");
            }}
            onKeyDown={(e) => e.key === "Enter" && verifyCode()}
          />
        </Field>
        {err ? <div className="mt-2"><ErrorBanner>{err}</ErrorBanner></div> : null}
        <div className="mt-3">
          <Button variant="ghost" size="sm" disabled={!!cooldown || busy} onClick={() => setCooldown(30)}>
            {cooldown ? t("code.resendIn", { seconds: cooldown }) : t("code.resend")}
          </Button>
        </div>
        <Button
          block
          className="mt-3"
          loading={busy}
          iconRight={busy ? undefined : <Check size={15} />}
          disabled={!codeValid}
          onClick={verifyCode}
        >
          {busy ? t("code.verifying") : t("code.verify")}
        </Button>
      </div>
    );
  } else if (stage === "reset") {
    body = (
      <div>
        <AuthLead crest={<PepMark size={36} />} eyebrow={t("reset.eyebrow")} title={t("reset.title")} sub={t("reset.sub")} />
        <div className="flex flex-col gap-3.5">
          <Field htmlFor="fp-pw" label={t("reset.newLabel")} required>
            <Input
              id="fp-pw"
              type="password"
              value={pw}
              autoFocus
              placeholder={t("reset.newPlaceholder", { min: PW_MIN })}
              prefix={<Lock size={14} />}
              onChange={(e) => setPw(e.target.value)}
            />
          </Field>
          <Field
            htmlFor="fp-confirm"
            label={t("reset.confirmLabel")}
            required
            error={confirm && !pwMatch ? t("reset.mismatch") : undefined}
          >
            <Input
              id="fp-confirm"
              type="password"
              value={confirm}
              placeholder={t("reset.confirmPlaceholder")}
              prefix={<Lock size={14} />}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && resetPassword()}
            />
          </Field>
          <PasswordChecklist password={pw} />
        </div>
        <Button
          block
          className="mt-4"
          loading={busy}
          iconRight={busy ? undefined : <Check size={15} />}
          disabled={!pwValid}
          onClick={resetPassword}
        >
          {busy ? t("reset.updating") : t("reset.update")}
        </Button>
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col items-center text-center">
        <AuthLead
          centered
          crest={
            <IconBadge tone="success" size={52}>
              <Check size={26} />
            </IconBadge>
          }
          title={t("done.title")}
          sub={t("done.sub")}
        />
        <Button className="mt-5" iconRight={<ArrowRight size={15} />} onClick={() => router.push("/login")}>
          {t("done.back")}
        </Button>
      </div>
    );
  }

  return <AuthShell showBrand>{body}</AuthShell>;
}
