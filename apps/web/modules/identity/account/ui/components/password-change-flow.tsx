"use client";

import { useState } from "react";
import { Check, Shield } from "lucide-react";
import { Button, Field, Input, Modal } from "@cloud/ui/components/ui";
import { toastError } from "@cloud/request/error-toast";
import { PASSWORD_POLICY } from "@cloud/constants";
import { useTranslations } from "@cloud/i18n/client";
import { changeAccountPassword } from "@/modules/identity/account/client/account.api";
import { getLoginChallenge } from "@/modules/identity/auth/client/auth.api";
import { encryptLoginPassword } from "@/lib/login-crypto";

// Real password change: re-auth current password + (step-up TOTP when MFA on) +
// policy/history. Passwords are RSA-encrypted in transit (same as login). The
// server validates everything at apply; client errors surface via toast.
type Step = "verify-old" | "mfa" | "new" | "done";

export function PasswordChangeFlow({
  mfaEnable,
  onClose,
  onDone,
}: {
  mfaEnable: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("account");
  const [step, setStep] = useState<Step>("verify-old");
  const [curPw, setCurPw] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const checks = [
    { key: "len", ok: newPw.length >= PASSWORD_POLICY.minLength },
    { key: "case", ok: /[a-z]/.test(newPw) && /[A-Z]/.test(newPw) },
    { key: "number", ok: /\d/.test(newPw) },
    { key: "symbol", ok: /[^A-Za-z0-9]/.test(newPw) },
    { key: "different", ok: newPw.length > 0 && newPw !== curPw },
  ];
  const allOk = checks.every((c) => c.ok);
  const ptype = show ? "text" : "password";
  const eye = (
    <Button
      type="button"
      variant="link"
      tabIndex={-1}
      className="text-xs font-normal text-content-secondary hover:no-underline"
      onClick={() => setShow((s) => !s)}
    >
      {show ? t("password.hide") : t("password.show")}
    </Button>
  );

  async function submit() {
    if (!allOk) return setErr(t("password.err.reqsNotMet"));
    if (newPw !== confirmPw) return setErr(t("password.err.mismatch"));
    setErr("");
    setBusy(true);
    try {
      const { serverTimestamp: ts, nonce } = (await getLoginChallenge()).data;
      const [encryptedCurrentPassword, encryptedNewPassword] = await Promise.all([
        encryptLoginPassword(curPw, ts, nonce),
        encryptLoginPassword(newPw, ts, nonce),
      ]);
      await changeAccountPassword({
        encryptedCurrentPassword,
        encryptedNewPassword,
        ...(mfaEnable ? { mfaCode: mfaCode.trim() } : {}),
      });
      setStep("done");
    } catch (e) {
      toastError(e);
      setBusy(false);
    }
  }

  let body: React.ReactNode;
  let footer: React.ReactNode;

  if (step === "verify-old") {
    body = (
      <div className="flex flex-col gap-3">
        <p className="text-md leading-relaxed text-content-secondary">{t("password.verifyOldDesc")}</p>
        <Field label={t("password.currentLabel")}>
          <Input type={ptype} value={curPw} autoFocus suffix={eye} placeholder={t("password.currentPlaceholder")}
            onChange={(e) => setCurPw(e.target.value)} />
        </Field>
        {mfaEnable && (
          <div className="flex items-start gap-2 rounded-lg border border-line-subtle bg-surface-3 px-3 py-2.5 text-xs text-content-secondary">
            <Shield size={15} className="mt-0.5 flex-none" />
            <span>{t("password.mfaNote")}</span>
          </div>
        )}
      </div>
    );
    footer = (
      <>
        <Button variant="ghost" onClick={onClose}>{t("password.cancel")}</Button>
        <Button variant="primary" disabled={!curPw} onClick={() => setStep(mfaEnable ? "mfa" : "new")}>
          {t("password.continue")}
        </Button>
      </>
    );
  } else if (step === "mfa") {
    body = (
      <div className="flex flex-col gap-3">
        <p className="text-md leading-relaxed text-content-secondary">{t("password.mfaDesc")}</p>
        <Input inputSize="lg" inputMode="numeric" maxLength={6} value={mfaCode} autoFocus placeholder="000000"
          className="text-center font-mono text-lg tracking-widest"
          onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
      </div>
    );
    footer = (
      <>
        <Button variant="ghost" onClick={() => setStep("verify-old")}>{t("password.back")}</Button>
        <Button variant="primary" disabled={mfaCode.length !== 6} onClick={() => setStep("new")}>
          {t("password.continue")}
        </Button>
      </>
    );
  } else if (step === "new") {
    body = (
      <div className="flex flex-col gap-3">
        <p className="text-md leading-relaxed text-content-secondary">{t("password.newDesc")}</p>
        <Field label={t("password.newLabel")}>
          <Input type={ptype} value={newPw} autoFocus suffix={eye} placeholder={t("password.newLabel")}
            onChange={(e) => { setNewPw(e.target.value); setErr(""); }} />
        </Field>
        <ul className="flex flex-col gap-1">
          {checks.map((c) => (
            <li key={c.key} className={`flex items-center gap-2 text-xs ${c.ok ? "text-success-strong" : "text-content-tertiary"}`}>
              <span className="flex size-4 items-center justify-center">{c.ok && <Check size={12} />}</span>
              {t(`password.reqs.${c.key}`, { min: PASSWORD_POLICY.minLength })}
            </li>
          ))}
        </ul>
        <Field label={t("password.confirmLabel")}>
          <Input type={ptype} value={confirmPw} suffix={eye} placeholder={t("password.confirmLabel")}
            onChange={(e) => { setConfirmPw(e.target.value); setErr(""); }} />
        </Field>
        {err && <p className="text-xs text-error-strong">{err}</p>}
      </div>
    );
    footer = (
      <>
        <Button variant="ghost" onClick={() => setStep(mfaEnable ? "mfa" : "verify-old")}>{t("password.back")}</Button>
        <Button variant="primary" loading={busy} onClick={submit}>{t("password.change")}</Button>
      </>
    );
  } else {
    body = (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-success-bg text-success-strong">
          <Check size={22} />
        </span>
        <p className="text-md leading-relaxed text-content-secondary">{t("password.doneDesc")}</p>
      </div>
    );
    footer = (
      <Button variant="primary" onClick={() => { onClose(); onDone(); }}>{t("password.done")}</Button>
    );
  }

  return (
    <Modal open onClose={onClose} size="sm" title={t(`password.title.${step}`)} footer={<div className="flex justify-end gap-2">{footer}</div>}>
      {body}
    </Modal>
  );
}
