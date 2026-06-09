"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Mail, User } from "lucide-react";
import {
  Badge,
  Button,
  Field,
  Input,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StepIndicator,
  cn,
} from "@cloud/ui";
import { useTranslations } from "@cloud/i18n/client";
import type { Invitation } from "@/lib/mock/types";
import { initials } from "@/lib/format";
import { isPasswordValid, PW_MIN } from "@/lib/password-rules";
import { COUNTRIES } from "@/lib/countries";
import { AuthLead, BackLink } from "@/app/(auth)/_components/card-bits";
import { PasswordChecklist } from "@/app/(auth)/_components/password-checklist";
import { EntRow, ObCard } from "./ob-bits";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGIN_RE = /^[a-z][a-z0-9._-]{1,30}$/;

interface RegisterDone {
  email: string;
  name: string;
  loginName: string;
  country: string;
}

export function ObRegister({
  invitation,
  onBack,
  onDone,
}: {
  invitation: Invitation;
  onBack: () => void;
  onDone: (account: RegisterDone) => void;
}) {
  const t = useTranslations("portal.onboarding.register");
  const tob = useTranslations("portal.onboarding");

  const [emailMode, setEmailMode] = useState<"invite" | "custom">("invite");
  const [customEmail, setCustomEmail] = useState("");
  const [code, setCode] = useState("");
  const [stepIdx, setStepIdx] = useState(0);
  const [acct, setAcct] = useState({ loginName: "", password: "", confirm: "", country: "US", displayName: "" });
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeErr, setCodeErr] = useState("");

  useEffect(() => {
    if (!cooldown) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const steps = useMemo(() => {
    const list = [{ id: "emailchoice", label: t("steps.email") }];
    if (emailMode === "custom") {
      list.push({ id: "emailnew", label: t("steps.newEmail") }, { id: "emailverify", label: t("steps.verify") });
    }
    list.push(
      { id: "login", label: t("steps.login") },
      { id: "password", label: t("steps.password") },
      { id: "country", label: t("steps.country") },
      { id: "display", label: t("steps.name") },
    );
    return list;
  }, [emailMode, t]);

  const cur = steps[Math.min(stepIdx, steps.length - 1)];
  const isLast = stepIdx === steps.length - 1;
  const effectiveEmail = emailMode === "invite" ? invitation.email : customEmail.trim();

  const customEmailValid = EMAIL_RE.test(customEmail.trim());
  const codeValid = /^\d{6}$/.test(code.trim());
  const loginValid = LOGIN_RE.test(acct.loginName.trim());
  const pwMatch = acct.password.length > 0 && acct.password === acct.confirm;
  const pwValid = isPasswordValid(acct.password) && pwMatch;
  const displayValid = acct.displayName.trim().length >= 1;
  const stepValid: Record<string, boolean> = {
    emailchoice: true,
    emailnew: customEmailValid,
    emailverify: codeValid,
    login: loginValid,
    password: pwValid,
    country: true,
    display: displayValid,
  };

  const advance = () => setStepIdx((i) => i + 1);
  function next() {
    // The new-email send/verify are ephemeral UI steps (no shared state); a real
    // build would add an onboarding email-verify endpoint. Account creation is
    // committed via /api/onboarding/register on accept.
    if (cur.id === "emailnew") {
      setSending(true);
      setCodeErr("");
      setTimeout(() => {
        setSending(false);
        setCooldown(30);
        advance();
      }, 600);
      return;
    }
    if (cur.id === "emailverify") {
      setVerifying(true);
      setCodeErr("");
      setTimeout(() => {
        setVerifying(false);
        if (codeValid) advance();
        else setCodeErr(t("verifyErr"));
      }, 500);
      return;
    }
    if (!isLast) return advance();
    onDone({
      email: effectiveEmail,
      name: acct.displayName.trim(),
      loginName: acct.loginName.trim(),
      country: acct.country,
    });
  }
  const back = () => (stepIdx === 0 ? onBack() : setStepIdx(stepIdx - 1));

  const title =
    cur.id === "emailchoice" ? t("titleEmail") : cur.id === "display" ? t("titleName") : cur.label;
  const continueLabel: Record<string, string> = {
    emailchoice: t("continue"),
    emailnew: sending ? t("sending") : t("sendCode"),
    emailverify: verifying ? t("verifying") : t("steps.verify"),
    login: t("continue"),
    password: t("continue"),
    country: t("continue"),
    display: t("reviewConfirm"),
  };

  return (
    <ObCard width="wide">
      <BackLink onClick={back}>{stepIdx === 0 ? tob("backToLanding") : tob("previousStep")}</BackLink>
      <AuthLead eyebrow={t("stepLabel", { current: stepIdx + 1, total: steps.length })} title={title} />

      <div className="mb-4 mt-3">
        <EntRow
          initials={initials(invitation.partner)}
          name={t("joining", { partner: invitation.partner })}
          sub={
            <span className="flex items-center gap-1.5">
              {emailMode === "invite"
                ? t.rich("emailFromInvite", { email: invitation.email, b: (c) => <strong>{c}</strong> })
                : t("customEmail")}
              <Badge tone={emailMode === "invite" ? "success" : "info"}>
                {emailMode === "invite" ? t("fromInvite") : t("custom")}
              </Badge>
            </span>
          }
        />
      </div>

      <div className="mb-5">
        <StepIndicator steps={steps.map((s) => ({ label: s.label }))} current={stepIdx} />
      </div>

      <div className="min-h-[96px]">
        {cur.id === "emailchoice" ? (
          <RadioGroup
            value={emailMode}
            onValueChange={(v) => setEmailMode(v as "invite" | "custom")}
            className="flex flex-col gap-2.5"
          >
            <label
              className={cn(
                "flex cursor-pointer gap-3 rounded-lg border p-3.5",
                emailMode === "invite" ? "border-primary-500 bg-primary-50" : "border-line-default hover:bg-surface-hover",
              )}
            >
              <RadioGroupItem value="invite" className="mt-0.5" />
              <div>
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  {t("inviteTitle")} <Badge tone="success">{t("verified")}</Badge>
                </div>
                <div className="mt-0.5 text-xs text-content-tertiary">
                  {t.rich("inviteSub", { email: invitation.email, b: (c) => <strong>{c}</strong> })}
                </div>
              </div>
            </label>
            <label
              className={cn(
                "flex cursor-pointer gap-3 rounded-lg border p-3.5",
                emailMode === "custom" ? "border-primary-500 bg-primary-50" : "border-line-default hover:bg-surface-hover",
              )}
            >
              <RadioGroupItem value="custom" className="mt-0.5" />
              <div>
                <div className="text-sm font-semibold">{t("customTitle")}</div>
                <div className="mt-0.5 text-xs text-content-tertiary">{t("customSub")}</div>
              </div>
            </label>
          </RadioGroup>
        ) : null}

        {cur.id === "emailnew" ? (
          <Field htmlFor="ob-newemail" label={t("newEmailLabel")} required hint={t("newEmailHint")}>
            <Input
              id="ob-newemail"
              type="email"
              value={customEmail}
              placeholder="name@company.com"
              autoFocus
              prefix={<Mail size={14} />}
              onChange={(e) => {
                setCustomEmail(e.target.value);
                setCode("");
                setCodeErr("");
              }}
            />
          </Field>
        ) : null}

        {cur.id === "emailverify" ? (
          <div className="flex flex-col gap-3.5">
            <p className="text-sm text-content-secondary">
              {t.rich("verifySent", { email: customEmail, b: (c) => <strong>{c}</strong> })}
            </p>
            <Field
              htmlFor="ob-vcode"
              label={t("verifyLabel")}
              required
              error={codeErr || undefined}
              hint={codeErr ? undefined : t.rich("verifyHint", { code: (c) => <code className="rounded bg-surface-3 px-1 font-mono">{c}</code> })}
            >
              <Input
                id="ob-vcode"
                value={code}
                placeholder="123456"
                maxLength={6}
                autoFocus
                inputMode="numeric"
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setCodeErr("");
                }}
              />
            </Field>
            <div>
              <Button variant="ghost" size="sm" disabled={!!cooldown} onClick={() => setCooldown(30)}>
                {cooldown ? t("resendIn", { seconds: cooldown }) : t("resend")}
              </Button>
            </div>
          </div>
        ) : null}

        {cur.id === "login" ? (
          <Field
            htmlFor="ob-login"
            label={t("loginLabel")}
            required
            error={acct.loginName && !loginValid ? t("loginErr") : undefined}
            hint={t("loginHint")}
          >
            <Input
              id="ob-login"
              value={acct.loginName}
              placeholder={t("loginPlaceholder")}
              autoFocus
              prefix={<User size={14} />}
              onChange={(e) => setAcct({ ...acct, loginName: e.target.value.toLowerCase().replace(/\s+/g, ".") })}
            />
          </Field>
        ) : null}

        {cur.id === "password" ? (
          <div className="flex flex-col gap-3">
            <Field htmlFor="ob-pw" label={t("passwordLabel")} required>
              <Input
                id="ob-pw"
                type="password"
                value={acct.password}
                autoFocus
                placeholder={`${PW_MIN}+`}
                onChange={(e) => setAcct({ ...acct, password: e.target.value })}
              />
            </Field>
            <Field
              htmlFor="ob-confirm"
              label={t("confirmLabel")}
              required
              error={acct.confirm && !pwMatch ? t("mismatch") : undefined}
            >
              <Input
                id="ob-confirm"
                type="password"
                value={acct.confirm}
                placeholder={t("confirmPlaceholder")}
                onChange={(e) => setAcct({ ...acct, confirm: e.target.value })}
              />
            </Field>
            <PasswordChecklist password={acct.password} />
          </div>
        ) : null}

        {cur.id === "country" ? (
          <Field label={t("countryLabel")} required hint={t("countryHint")}>
            <Select value={acct.country} onValueChange={(v) => setAcct({ ...acct, country: v as string })}>
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
        ) : null}

        {cur.id === "display" ? (
          <Field htmlFor="ob-display" label={t("displayLabel")} required hint={t("displayHint")}>
            <Input
              id="ob-display"
              value={acct.displayName}
              placeholder={t("displayPlaceholder")}
              autoFocus
              prefix={<User size={14} />}
              onChange={(e) => setAcct({ ...acct, displayName: e.target.value })}
            />
          </Field>
        ) : null}
      </div>

      <div className="mt-5 flex justify-end gap-2.5">
        <Button variant="ghost" onClick={back}>
          {stepIdx === 0 ? tob("back") : tob("previous")}
        </Button>
        <Button
          loading={sending || verifying}
          iconRight={
            sending || verifying ? undefined : cur.id === "display" || cur.id === "emailverify" ? (
              <Check size={15} />
            ) : (
              <ChevronRight size={15} />
            )
          }
          disabled={!stepValid[cur.id] || sending || verifying}
          onClick={next}
        >
          {continueLabel[cur.id]}
        </Button>
      </div>
    </ObCard>
  );
}
