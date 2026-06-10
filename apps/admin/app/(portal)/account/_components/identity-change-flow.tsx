"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Field, Input, Modal, toast } from "@cloud/ui/components/ui";
import { request } from "@cloud/request/client";
import { toastError } from "@cloud/request/error-toast";
import { useTranslations } from "@cloud/i18n/client";
import type { AccountProfile } from "@/app/(portal)/account/_shared/types";

// Verified email / username change against the real endpoints. Codes are sent
// server-side (delivered via a logged stub for now) and verified at apply time.
//   email:    verify-old → new → verify-new → PATCH /api/account/email
//   username: verify-old → new → PATCH /api/account/username

type Step = "verify-old" | "new" | "verify-new";
type Purpose = "EMAIL_CURRENT" | "EMAIL_NEW" | "USERNAME_CURRENT";

export function IdentityChangeFlow({
  mode,
  profile,
  onClose,
  onApplied,
}: {
  mode: "email" | "username";
  profile: AccountProfile;
  onClose: () => void;
  onApplied: (next: AccountProfile) => void;
}) {
  const t = useTranslations("account");
  const isEmail = mode === "email";

  const [step, setStep] = useState<Step>("verify-old");
  const [currentCode, setCurrentCode] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newCode, setNewCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestCode(purpose: Purpose, newEmail?: string) {
    try {
      await request.post("/api/account/identity/request-code", {
        purpose,
        ...(newEmail ? { newEmail } : {}),
      });
    } catch (err) {
      toastError(err);
    }
  }

  // Send the current-email code once when the flow opens. The ref guard keeps it
  // single-fire under React Strict Mode (dev double-invokes effects), so the code
  // (and, later, the email) is only issued once.
  const sentInitial = useRef(false);
  useEffect(() => {
    if (sentInitial.current) return;
    sentInitial.current = true;
    void requestCode(isEmail ? "EMAIL_CURRENT" : "USERNAME_CURRENT");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function continueFromNew() {
    if (isEmail) {
      const email = newValue.trim();
      if (!email) return;
      await requestCode("EMAIL_NEW", email);
      setStep("verify-new");
      return;
    }
    // username: apply directly with the current-email code
    setBusy(true);
    try {
      const res = await request.patch<AccountProfile>("/api/account/username", {
        newUsername: newValue.trim(),
        currentCode: currentCode.trim(),
      });
      toast.success(t("identity.doneUsername", { username: res.data.username }));
      onApplied(res.data);
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  async function applyEmail() {
    setBusy(true);
    try {
      const res = await request.patch<AccountProfile>("/api/account/email", {
        newEmail: newValue.trim(),
        currentCode: currentCode.trim(),
        newCode: newCode.trim(),
      });
      toast.success(t("identity.doneEmail", { email: res.data.email }));
      onApplied(res.data);
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  const otpInput = (value: string, onChange: (v: string) => void) => (
    <Input
      inputSize="lg"
      inputMode="numeric"
      maxLength={6}
      value={value}
      autoFocus
      placeholder="000000"
      className="text-center font-mono text-lg tracking-widest"
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
    />
  );

  let body: React.ReactNode;
  let footer: React.ReactNode;

  if (step === "verify-old") {
    body = (
      <div className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed text-content-secondary">
          {t("identity.verifyOldDesc", { email: profile.email })}
        </p>
        {otpInput(currentCode, setCurrentCode)}
        <button
          type="button"
          className="cursor-pointer self-start text-xs text-primary hover:underline"
          onClick={() => requestCode(isEmail ? "EMAIL_CURRENT" : "USERNAME_CURRENT")}
        >
          {t("identity.resend")}
        </button>
      </div>
    );
    footer = (
      <>
        <Button variant="ghost" onClick={onClose}>{t("identity.cancel")}</Button>
        <Button variant="primary" disabled={currentCode.length !== 6} onClick={() => setStep("new")}>
          {t("identity.continue")}
        </Button>
      </>
    );
  } else if (step === "new") {
    body = (
      <div className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed text-content-secondary">
          {isEmail ? t("identity.newEmailDesc") : t("identity.newUsernameDesc")}
        </p>
        <Field label={isEmail ? t("identity.newEmailLabel") : t("identity.newUsernameLabel")}>
          <Input
            value={newValue}
            autoFocus
            placeholder={isEmail ? "name@company.com" : "jordan.diaz"}
            prefix={isEmail ? undefined : "@"}
            onChange={(e) => setNewValue(e.target.value)}
          />
        </Field>
      </div>
    );
    footer = (
      <>
        <Button variant="ghost" onClick={() => setStep("verify-old")}>{t("identity.back")}</Button>
        <Button variant="primary" disabled={!newValue.trim() || busy} loading={busy} onClick={continueFromNew}>
          {isEmail ? t("identity.continue") : t("identity.changeUsername")}
        </Button>
      </>
    );
  } else {
    body = (
      <div className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed text-content-secondary">
          {t("identity.verifyNewDesc", { email: newValue })}
        </p>
        {otpInput(newCode, setNewCode)}
      </div>
    );
    footer = (
      <>
        <Button variant="ghost" onClick={() => setStep("new")}>{t("identity.back")}</Button>
        <Button variant="primary" disabled={newCode.length !== 6 || busy} loading={busy} onClick={applyEmail}>
          {t("identity.verifyChange")}
        </Button>
      </>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={t(`identity.title.${mode}.${step}`)}
      footer={<div className="flex justify-end gap-2">{footer}</div>}
    >
      {body}
    </Modal>
  );
}
