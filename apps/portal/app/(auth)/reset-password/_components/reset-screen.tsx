"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Lock } from "lucide-react";
import { Button, Field, Input, Spinner } from "@cloud/ui";
import { RequestError } from "@cloud/request/client";
import { getLoginChallenge } from "@/service/auth/api";
import { resetPassword, validateResetToken } from "@/service/forgot-password/api";
import { useTranslations } from "@cloud/i18n/client";
import { isPasswordValid, PW_MIN } from "@/lib/password-rules";
import { encryptLoginPassword } from "@/lib/login-crypto";
import { PepMark } from "@/app/_components/brand";
import { AuthShell } from "@/app/_components/auth-shell";
import { AuthLead, ErrorBanner, IconBadge } from "@/app/(auth)/_components/card-bits";
import { PasswordChecklist } from "@/app/(auth)/_components/password-checklist";

type Stage = "loading" | "invalid" | "form" | "done";

// 重置页（自助找回 + 管理员重置的链接都落这里）：校验 token → 设新密码（RSA 加密）→ 完成。
export function ResetScreen({ token }: { token: string }) {
  const t = useTranslations("portal.resetPassword");
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("loading");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    validateResetToken(token)
      .then((res) => setStage(res.data.valid ? "form" : "invalid"))
      .catch(() => setStage("invalid"));
  }, [token]);

  const pwMatch = pw.length > 0 && pw === confirm;
  const pwValid = isPasswordValid(pw) && pwMatch;

  async function submit() {
    if (!pwValid) return;
    setErr("");
    setBusy(true);
    try {
      const challenge = await getLoginChallenge();
      const encryptedPassword = await encryptLoginPassword(pw, challenge.data.serverTimestamp, challenge.data.nonce);
      await resetPassword({ token, encryptedPassword });
      setStage("done");
    } catch (e) {
      setErr(e instanceof RequestError ? (e.body?.message ?? t("error")) : t("error"));
      setBusy(false);
    }
  }

  let body;
  if (stage === "loading") {
    body = <Spinner size="xl" />;
  } else if (stage === "invalid") {
    body = (
      <div className="flex flex-col items-center text-center">
        <AuthLead centered crest={<PepMark size={36} />} title={t("invalid.title")} sub={t("invalid.sub")} />
        <Button className="mt-5" iconRight={<ArrowRight size={15} />} onClick={() => router.push("/forgot-password")}>
          {t("invalid.requestNew")}
        </Button>
      </div>
    );
  } else if (stage === "done") {
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
          {t("done.signIn")}
        </Button>
      </div>
    );
  } else {
    body = (
      <div>
        <AuthLead crest={<PepMark size={36} />} eyebrow={t("form.eyebrow")} title={t("form.title")} sub={t("form.sub")} />
        <div className="flex flex-col gap-3.5">
          <Field htmlFor="rp-pw" label={t("form.newLabel")} required>
            <Input
              id="rp-pw"
              type="password"
              value={pw}
              autoFocus
              placeholder={t("form.newPlaceholder", { min: PW_MIN })}
              prefix={<Lock size={14} />}
              onChange={(e) => setPw(e.target.value)}
            />
          </Field>
          <Field
            htmlFor="rp-confirm"
            label={t("form.confirmLabel")}
            required
            error={confirm && !pwMatch ? t("form.mismatch") : undefined}
          >
            <Input
              id="rp-confirm"
              type="password"
              value={confirm}
              placeholder={t("form.confirmPlaceholder")}
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
          iconRight={busy ? undefined : <Check size={15} />}
          disabled={!pwValid}
          onClick={submit}
        >
          {busy ? t("form.submitting") : t("form.submit")}
        </Button>
      </div>
    );
  }

  return <AuthShell showBrand>{body}</AuthShell>;
}
