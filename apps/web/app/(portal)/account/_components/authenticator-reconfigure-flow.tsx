"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Button, Input, Modal } from "@cloud/ui/components/ui";
import { useTranslations } from "@cloud/i18n/client";
import { QrCode } from "./qr-code";

// Reconfigure the single authenticator-app MFA factor. Verified end-to-end:
//   confirm current code → scan new setup key → confirm new code → done.
// Codes/secret are simulated client-side (mock) and shown as hints.
const genCode = () => String(Math.floor(100000 + Math.random() * 900000));
function genSecret() {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let out = "";
  for (let i = 0; i < 16; i++) out += A[Math.floor(Math.random() * A.length)];
  return out.replace(/(.{4})(?=.)/g, "$1 ");
}

type Step = "verify" | "scan" | "confirm" | "done";

function Otp({
  value,
  onChange,
  onEnter,
  hint,
  code,
  err,
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
  hint: React.ReactNode;
  code: string;
  err: string;
}) {
  const t = useTranslations("account");
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-content-secondary">{hint}</p>
      <Input
        inputSize="lg"
        inputMode="numeric"
        maxLength={6}
        value={value}
        autoFocus
        placeholder="000000"
        className="text-center font-mono text-lg tracking-widest"
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        onKeyDown={(e) => e.key === "Enter" && onEnter()}
      />
      <div className="flex items-center justify-between text-xs text-content-tertiary">
        <span>{t("authn.openApp")}</span>
        <span>
          {t("authn.demoCode")} <strong className="text-content-secondary">{code}</strong>
        </span>
      </div>
      {err && <p className="text-xs text-error-strong">{err}</p>}
    </div>
  );
}

export function AuthenticatorReconfigureFlow({
  appName,
  onClose,
  onDone,
}: {
  appName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("account");
  const [step, setStep] = useState<Step>("verify");
  const [curCode] = useState(genCode);
  const [newCode] = useState(genCode);
  const [entry, setEntry] = useState("");
  const [err, setErr] = useState("");
  const secret = useMemo(() => genSecret(), []);

  function verify() {
    if (entry.trim() !== curCode) return setErr(t("authn.err.wrongCurrent"));
    setErr("");
    setEntry("");
    setStep("scan");
  }
  function confirm() {
    if (entry.trim() !== newCode) return setErr(t("authn.err.wrongNew"));
    setErr("");
    setStep("done");
    onDone();
  }

  let body: React.ReactNode;
  let footer: React.ReactNode;

  if (step === "verify") {
    body = (
      <Otp
        value={entry}
        onChange={(v) => { setEntry(v); setErr(""); }}
        onEnter={verify}
        code={curCode}
        err={err}
        hint={t("authn.verifyDesc")}
      />
    );
    footer = (
      <>
        <Button variant="ghost" onClick={onClose}>{t("authn.cancel")}</Button>
        <Button variant="primary" onClick={verify}>{t("authn.continue")}</Button>
      </>
    );
  } else if (step === "scan") {
    body = (
      <div className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed text-content-secondary">{t("authn.scanDesc", { app: appName })}</p>
        <div className="flex justify-center rounded-lg border border-dashed border-line-default bg-surface-3 p-4">
          <QrCode seed={secret} />
        </div>
        <div className="rounded-lg bg-surface-3 px-3 py-2.5">
          <div className="text-xs text-content-tertiary">{t("authn.setupKeyLabel")}</div>
          <code className="font-mono text-sm tracking-wide text-content-primary">{secret}</code>
        </div>
      </div>
    );
    footer = (
      <>
        <Button variant="ghost" onClick={() => { setEntry(""); setErr(""); setStep("verify"); }}>
          {t("authn.back")}
        </Button>
        <Button variant="primary" onClick={() => { setEntry(""); setErr(""); setStep("confirm"); }}>
          {t("authn.scanned")}
        </Button>
      </>
    );
  } else if (step === "confirm") {
    body = (
      <Otp
        value={entry}
        onChange={(v) => { setEntry(v); setErr(""); }}
        onEnter={confirm}
        code={newCode}
        err={err}
        hint={t("authn.confirmDesc", { app: appName })}
      />
    );
    footer = (
      <>
        <Button variant="ghost" onClick={() => { setEntry(""); setErr(""); setStep("scan"); }}>
          {t("authn.back")}
        </Button>
        <Button variant="primary" onClick={confirm}>{t("authn.confirm")}</Button>
      </>
    );
  } else {
    body = (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-success-bg text-success-strong">
          <Check size={22} />
        </span>
        <p className="text-sm leading-relaxed text-content-secondary">{t("authn.doneDesc")}</p>
      </div>
    );
    footer = <Button variant="primary" onClick={onClose}>{t("authn.done")}</Button>;
  }

  return (
    <Modal open onClose={onClose} size="sm" title={t(`authn.title.${step}`)} footer={<div className="flex justify-end gap-2">{footer}</div>}>
      {body}
    </Modal>
  );
}
