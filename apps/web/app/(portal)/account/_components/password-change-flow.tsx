"use client";

import { useState } from "react";
import { Check, Shield } from "lucide-react";
import { Button, Field, Input, Modal } from "@cloud/ui/components/ui";
import { useTranslations } from "@cloud/i18n/client";

// Security-critical password rotation, so it re-authenticates first:
//   verify current password → step-up MFA (if enabled) → new password → done
// Codes/password are simulated client-side (mock) and surfaced as hints.
const DEMO_CURRENT_PW = "Carbon@2026";
const PW_MIN = 12;
const genCode = () => String(Math.floor(100000 + Math.random() * 900000));

type Step = "verify-old" | "mfa" | "new" | "done";

export function PasswordChangeFlow({
  mfaEnabled,
  mfaLabel,
  onClose,
  onDone,
}: {
  mfaEnabled: boolean;
  mfaLabel: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("account");
  const [step, setStep] = useState<Step>("verify-old");
  const [curPw, setCurPw] = useState("");
  const [code, setCode] = useState("");
  const [entry, setEntry] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");

  const checks = [
    { key: "len", ok: newPw.length >= PW_MIN },
    { key: "case", ok: /[a-z]/.test(newPw) && /[A-Z]/.test(newPw) },
    { key: "number", ok: /\d/.test(newPw) },
    { key: "symbol", ok: /[^A-Za-z0-9]/.test(newPw) },
    { key: "different", ok: newPw.length > 0 && newPw !== curPw },
  ];
  const allOk = checks.every((c) => c.ok);

  function verifyOld() {
    if (curPw !== DEMO_CURRENT_PW) return setErr(t("password.err.wrongCurrent"));
    setErr("");
    if (mfaEnabled) {
      setCode(genCode());
      setEntry("");
      setStep("mfa");
    } else {
      setStep("new");
    }
  }
  function verifyMfa() {
    if (entry.trim() !== code) return setErr(t("password.err.wrongCode"));
    setErr("");
    setStep("new");
  }
  function submitNew() {
    if (!allOk) return setErr(t("password.err.reqsNotMet"));
    if (newPw !== confirmPw) return setErr(t("password.err.mismatch"));
    setErr("");
    setStep("done");
  }

  const ptype = show ? "text" : "password";
  const eye = (
    <button type="button" tabIndex={-1} className="cursor-pointer text-xs text-content-secondary" onClick={() => setShow((s) => !s)}>
      {show ? t("password.hide") : t("password.show")}
    </button>
  );

  let body: React.ReactNode;
  let footer: React.ReactNode;

  if (step === "verify-old") {
    body = (
      <div className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed text-content-secondary">{t("password.verifyOldDesc")}</p>
        <Field label={t("password.currentLabel")}>
          <Input
            type={ptype}
            value={curPw}
            autoFocus
            suffix={eye}
            placeholder={t("password.currentPlaceholder")}
            onChange={(e) => {
              setCurPw(e.target.value);
              setErr("");
            }}
            onKeyDown={(e) => e.key === "Enter" && verifyOld()}
          />
        </Field>
        {mfaEnabled && (
          <div className="flex items-start gap-2 rounded-lg border border-line-subtle bg-surface-3 px-3 py-2.5 text-xs text-content-secondary">
            <Shield size={15} className="mt-0.5 flex-none" />
            <span>{t("password.mfaNote", { label: mfaLabel })}</span>
          </div>
        )}
        {err && <p className="text-xs text-error-strong">{err}</p>}
        <p className="text-xs text-content-tertiary">
          {t("password.demoPw")} <strong className="text-content-secondary">{DEMO_CURRENT_PW}</strong>
        </p>
      </div>
    );
    footer = (
      <>
        <Button variant="ghost" onClick={onClose}>
          {t("password.cancel")}
        </Button>
        <Button variant="primary" onClick={verifyOld}>
          {t("password.continue")}
        </Button>
      </>
    );
  } else if (step === "mfa") {
    body = (
      <div className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed text-content-secondary">{t("password.mfaDesc", { label: mfaLabel })}</p>
        <Input
          inputSize="lg"
          inputMode="numeric"
          maxLength={6}
          value={entry}
          autoFocus
          placeholder="000000"
          className="text-center font-mono text-lg tracking-widest"
          onChange={(e) => setEntry(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && verifyMfa()}
        />
        <div className="flex items-center justify-between text-xs text-content-tertiary">
          <button
            type="button"
            className="cursor-pointer text-primary hover:underline"
            onClick={() => {
              setCode(genCode());
              setEntry("");
              setErr("");
            }}
          >
            {t("password.useNewCode")}
          </button>
          <span>
            {t("password.demoCode")} <strong className="text-content-secondary">{code}</strong>
          </span>
        </div>
        {err && <p className="text-xs text-error-strong">{err}</p>}
      </div>
    );
    footer = (
      <>
        <Button variant="ghost" onClick={() => { setErr(""); setStep("verify-old"); }}>
          {t("password.back")}
        </Button>
        <Button variant="primary" onClick={verifyMfa}>
          {t("password.verify")}
        </Button>
      </>
    );
  } else if (step === "new") {
    body = (
      <div className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed text-content-secondary">{t("password.newDesc")}</p>
        <Field label={t("password.newLabel")}>
          <Input
            type={ptype}
            value={newPw}
            autoFocus
            suffix={eye}
            placeholder={t("password.newLabel")}
            onChange={(e) => { setNewPw(e.target.value); setErr(""); }}
          />
        </Field>
        <ul className="flex flex-col gap-1">
          {checks.map((c) => (
            <li
              key={c.key}
              className={`flex items-center gap-2 text-xs ${c.ok ? "text-success-strong" : "text-content-tertiary"}`}
            >
              <span className="flex size-4 items-center justify-center">{c.ok && <Check size={12} />}</span>
              {t(`password.reqs.${c.key}`, { min: PW_MIN })}
            </li>
          ))}
        </ul>
        <Field label={t("password.confirmLabel")}>
          <Input
            type={ptype}
            value={confirmPw}
            suffix={eye}
            placeholder={t("password.confirmLabel")}
            onChange={(e) => { setConfirmPw(e.target.value); setErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && submitNew()}
          />
        </Field>
        {err && <p className="text-xs text-error-strong">{err}</p>}
      </div>
    );
    footer = (
      <>
        <Button variant="ghost" onClick={() => { setErr(""); setStep(mfaEnabled ? "mfa" : "verify-old"); }}>
          {t("password.back")}
        </Button>
        <Button variant="primary" onClick={submitNew}>
          {t("password.change")}
        </Button>
      </>
    );
  } else {
    body = (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-success-bg text-success-strong">
          <Check size={22} />
        </span>
        <p className="text-sm leading-relaxed text-content-secondary">{t("password.doneDesc")}</p>
      </div>
    );
    footer = (
      <Button variant="primary" onClick={() => { onClose(); onDone(); }}>
        {t("password.done")}
      </Button>
    );
  }

  return (
    <Modal open onClose={onClose} size="sm" title={t(`password.title.${step}`)} footer={<div className="flex justify-end gap-2">{footer}</div>}>
      {body}
    </Modal>
  );
}
