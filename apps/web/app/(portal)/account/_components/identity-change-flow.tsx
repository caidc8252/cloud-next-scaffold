"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button, Field, Input, Modal } from "@cloud/ui/components/ui";
import { useTranslations } from "@cloud/i18n/client";
import type { Profile } from "@/app/(portal)/account/_shared/types";

// Verified email / username change. The codes are simulated client-side (the
// prototype is a mock) and shown in a hint so they can be entered. Only the
// final, verified value is applied via onApply → PATCH /api/account/profile.
//   email:    verify-old → new → verify-new → done (then real sign-out)
//   username: verify-old → new → done

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const genCode = () => String(Math.floor(100000 + Math.random() * 900000));

type Step = "verify-old" | "new" | "verify-new" | "done";

export function IdentityChangeFlow({
  mode,
  user,
  onClose,
  onApply,
}: {
  mode: "email" | "username";
  user: Profile;
  onClose: () => void;
  onApply: (patch: Partial<Profile>) => void;
}) {
  const t = useTranslations("account");
  const isEmail = mode === "email";

  const [step, setStep] = useState<Step>("verify-old");
  // First code is generated for the current email at mount (lazy init).
  const [code, setCode] = useState(genCode);
  const [sentTo, setSentTo] = useState(user.email);
  const [entry, setEntry] = useState("");
  const [newVal, setNewVal] = useState("");
  const [err, setErr] = useState("");

  function sendTo(addr: string) {
    setCode(genCode());
    setSentTo(addr);
    setEntry("");
    setErr("");
  }

  function checkCode(onOk: () => void) {
    if (entry.trim() !== code) {
      setErr(t("identity.err.incorrectCode"));
      return;
    }
    setErr("");
    onOk();
  }

  function submitNew() {
    if (isEmail) {
      const v = newVal.trim();
      if (!EMAIL_RX.test(v)) return setErr(t("identity.err.invalidEmail"));
      if (v.toLowerCase() === user.email.toLowerCase()) return setErr(t("identity.err.sameEmail"));
      setErr("");
      sendTo(v);
      setStep("verify-new");
    } else {
      const v = newVal.trim();
      if (!/^[a-z0-9._-]{3,32}$/i.test(v)) return setErr(t("identity.err.invalidUsername"));
      if (v.toLowerCase() === user.username.toLowerCase()) return setErr(t("identity.err.sameUsername"));
      setErr("");
      onApply({ username: v });
      setStep("done");
    }
  }

  const titleKey = `identity.title.${mode}.${step}` as const;

  const otpField = (desc: React.ReactNode) => (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-content-secondary">{desc}</p>
      <Input
        inputSize="lg"
        inputMode="numeric"
        maxLength={6}
        value={entry}
        autoFocus
        placeholder="000000"
        className="text-center font-mono text-lg tracking-widest"
        onChange={(e) => setEntry(e.target.value.replace(/\D/g, "").slice(0, 6))}
      />
      <div className="flex items-center justify-between text-xs text-content-tertiary">
        <button type="button" className="cursor-pointer text-primary hover:underline" onClick={() => sendTo(sentTo)}>
          {t("identity.resend")}
        </button>
        <span>
          {t("identity.demoCode")} <strong className="text-content-secondary">{code}</strong>
        </span>
      </div>
      {err && <p className="text-xs text-error-strong">{err}</p>}
    </div>
  );

  let body: React.ReactNode;
  let footer: React.ReactNode;

  if (step === "verify-old") {
    body = otpField(t("identity.verifyOldDesc", { email: user.email }));
    footer = (
      <>
        <Button variant="ghost" onClick={onClose}>
          {t("identity.cancel")}
        </Button>
        <Button variant="primary" onClick={() => checkCode(() => setStep("new"))}>
          {t("identity.verify")}
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
            value={newVal}
            autoFocus
            placeholder={isEmail ? "name@company.com" : "jordan.diaz"}
            prefix={isEmail ? undefined : "@"}
            onChange={(e) => {
              setNewVal(e.target.value);
              setErr("");
            }}
          />
        </Field>
        {err && <p className="text-xs text-error-strong">{err}</p>}
      </div>
    );
    footer = (
      <>
        <Button
          variant="ghost"
          onClick={() => {
            setErr("");
            setStep("verify-old");
          }}
        >
          {t("identity.back")}
        </Button>
        <Button variant="primary" onClick={submitNew}>
          {isEmail ? t("identity.continue") : t("identity.changeUsername")}
        </Button>
      </>
    );
  } else if (step === "verify-new") {
    body = otpField(t("identity.verifyNewDesc", { email: newVal }));
    footer = (
      <>
        <Button
          variant="ghost"
          onClick={() => {
            setErr("");
            setStep("new");
          }}
        >
          {t("identity.back")}
        </Button>
        <Button
          variant="primary"
          onClick={() =>
            checkCode(() => {
              onApply({ email: newVal.trim() });
              setStep("done");
            })
          }
        >
          {t("identity.verifyChange")}
        </Button>
      </>
    );
  } else {
    body = (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-success-bg text-success-strong">
          <Check size={22} />
        </span>
        <p className="text-sm leading-relaxed text-content-secondary">
          {isEmail ? t("identity.doneEmail", { email: newVal }) : t("identity.doneUsername", { username: newVal })}
        </p>
      </div>
    );
    footer = isEmail ? (
      // Email change → real sign-out, mirroring the prototype's "sign back in".
      <form action="/api/auth/logout" method="post">
        <Button type="submit" variant="primary">
          {t("identity.signOut")}
        </Button>
      </form>
    ) : (
      <Button variant="primary" onClick={onClose}>
        {t("identity.done")}
      </Button>
    );
  }

  return (
    <Modal open onClose={onClose} size="sm" title={t(titleKey)} footer={<div className="flex justify-end gap-2">{footer}</div>}>
      {body}
    </Modal>
  );
}
