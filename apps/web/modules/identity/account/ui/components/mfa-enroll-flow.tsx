"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Button, Input, Modal } from "@cloud/ui/components/ui";
import { toastError } from "@cloud/request/error-toast";
import { useTranslations } from "@cloud/i18n/client";
import { activateAccountMfa, enrollAccountMfa } from "@/modules/identity/account/client/account.api";
import type { EnrollData } from "@/modules/identity/account/schema/account.types";
import type { AccountSecurity } from "@/modules/identity/account/schema/account.types";
import { QrCode } from "./qr-code";

// MFA enrollment — used for both Enable (mfaEnable=false) and Reconfigure (active).
// The server decides which based on mfaEnable; the `reconfigure` prop only tunes copy.
//   enroll (creates/refreshes PENDING + secret) → scan QR / setup key → activate.
type Step = "scan" | "confirm" | "done";

export function MfaEnrollFlow({
  reconfigure,
  onClose,
  onDone,
}: {
  reconfigure: boolean;
  onClose: () => void;
  onDone: (security: AccountSecurity) => void;
}) {
  const t = useTranslations("account");
  const [step, setStep] = useState<Step>("scan");
  const [enroll, setEnroll] = useState<EnrollData | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  // Start enrollment once on open. The ref guard keeps it single-fire under React
  // Strict Mode (dev double-invokes effects) — important because reconfigure
  // creates a PENDING row, and a double-fire would orphan one / break activation.
  // The ref guard alone keeps this single-fire under React Strict Mode (dev
  // double-invokes effects; the ref persists across the remount). Don't add an
  // `active`/cleanup cancel flag here: the guard blocks the second run from
  // re-issuing, so a cleanup that flips `active=false` would drop the one
  // in-flight response and leave the QR stuck on its loading placeholder.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    enrollAccountMfa()
      .then((res) => setEnroll(res.data))
      .catch((e) => {
        toastError(e);
        onClose();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function activate() {
    if (!enroll) return;
    setBusy(true);
    try {
      const res = await activateAccountMfa({
        mfaInfoId: enroll.mfaInfoId,
        code: code.trim(),
      });
      onDone(res.data);
      setStep("done");
    } catch (e) {
      toastError(e);
      setBusy(false);
    }
  }

  const title =
    step === "done"
      ? t("mfa.enroll.doneTitle")
      : reconfigure
        ? t("mfa.enroll.reconfigureTitle")
        : t("mfa.enroll.enableTitle");

  let body: React.ReactNode;
  let footer: React.ReactNode;

  if (step === "scan") {
    body = (
      <div className="flex flex-col items-center gap-3">
        <p className="self-stretch text-md leading-relaxed text-content-secondary">{t("mfa.enroll.scanDesc")}</p>
        {enroll ? <QrCode value={enroll.otpauthUri} /> : <div className="size-44 animate-pulse rounded-lg bg-surface-3" />}
        {enroll && (
          <div className="self-stretch rounded-lg bg-surface-3 px-3 py-2.5">
            <div className="text-xs text-content-tertiary">{t("mfa.enroll.setupKey")}</div>
            <code className="font-mono text-md tracking-wide text-content-primary">{enroll.secret}</code>
          </div>
        )}
      </div>
    );
    footer = (
      <>
        <Button variant="ghost" onClick={onClose}>{t("mfa.cancel")}</Button>
        <Button variant="primary" disabled={!enroll} onClick={() => setStep("confirm")}>{t("mfa.enroll.scanned")}</Button>
      </>
    );
  } else if (step === "confirm") {
    body = (
      <div className="flex flex-col gap-3">
        <p className="text-md leading-relaxed text-content-secondary">{t("mfa.enroll.confirmDesc")}</p>
        <Input
          inputSize="lg"
          inputMode="numeric"
          maxLength={6}
          value={code}
          autoFocus
          placeholder="000000"
          className="text-center font-mono text-lg tracking-widest"
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        />
      </div>
    );
    footer = (
      <>
        <Button variant="ghost" onClick={() => setStep("scan")}>{t("mfa.back")}</Button>
        <Button variant="primary" disabled={code.length !== 6 || busy} loading={busy} onClick={activate}>
          {t("mfa.enroll.confirm")}
        </Button>
      </>
    );
  } else {
    body = (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-success-bg text-success-strong">
          <Check size={22} />
        </span>
        <p className="text-md leading-relaxed text-content-secondary">{t("mfa.enroll.doneDesc")}</p>
      </div>
    );
    footer = <Button variant="primary" onClick={onClose}>{t("mfa.done")}</Button>;
  }

  return (
    <Modal open onClose={onClose} size="sm" title={title} footer={<div className="flex justify-end gap-2">{footer}</div>}>
      {body}
    </Modal>
  );
}
