"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Info, Lock, Mail, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge, Button, Input, Label } from "@cloud/ui";
import { getSsoDomains } from "@/service/auth/api";
import { useTranslations } from "@cloud/i18n/client";
import type { ProviderId, SsoTenant } from "@/lib/mock/types";
import { PepMark } from "@/app/_components/brand";
import { ProviderButton } from "@/app/_components/provider-button";
import { PROVIDERS } from "@/app/_components/provider-mark";
import { AuthLead, Divider, ErrorBanner } from "@/app/(auth)/_components/card-bits";
import { validateLoginAccount } from "./login-account";

const DEMO_ACCOUNTS = "locked@pep.io · ratelimited@pep.io · nocompany@pep.io · sms@pep.io · solo@pep.io";
const THIRD_PARTY: ProviderId[] = ["google", "microsoft", "apple"];

export function LoginForm({
  serverError,
  onClearError,
  onPassword,
  onProvider,
  onEnterprise,
}: {
  serverError: string | null;
  onClearError: () => void;
  onPassword: (email: string, password: string) => void;
  onProvider: (id: ProviderId) => void;
  onEnterprise: (tenant: SsoTenant, email: string) => void;
}) {
  const t = useTranslations("portal.login");
  const tb = useTranslations("portal.brand");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [tenants, setTenants] = useState<SsoTenant[]>([]);

  // SSO domain registry — fetched once, resolved locally as the user types.
  useEffect(() => {
    getSsoDomains()
      .then((res) => setTenants(res.data.tenants))
      .catch(() => setTenants([]));
  }, []);

  const domain = email.includes("@") ? email.split("@")[1].toLowerCase().trim() : "";
  const tenant = tenants.find((tn) => tn.domain === domain) ?? null;
  const ssoActive = tenant?.contract === "ACTIVE";
  const ssoSuspended = tenant?.contract === "SUSPENDED";
  const accountReady = email.trim().length > 0;
  const shownError = err || serverError || "";

  function clearErrors() {
    setErr("");
    if (serverError) onClearError();
  }

  function submitPassword() {
    const account = validateLoginAccount(email);
    if (!account.ok) {
      return setErr(account.reason === "required" ? t("errors.accountRequired") : t("errors.invalidEmail"));
    }
    if (pw.length < 6) return setErr(t("errors.passwordMin"));
    setErr("");
    onPassword(account.account, pw);
  }

  const providerLabel = (id: ProviderId) =>
    t.rich("continueWith", {
      provider: PROVIDERS[id].label,
      b: (c) => <strong className="font-semibold">{c}</strong>,
    });

  return (
    <div>
      <AuthLead
        crest={<PepMark size={36} />}
        eyebrow={tb("full")}
        title={t("title")}
        sub={t("subtitle", { by: tb("by") })}
      />

      <div className="flex flex-col gap-2.5">
        {THIRD_PARTY.map((id) => (
          <ProviderButton key={id} id={id} label={providerLabel(id)} onClick={() => onProvider(id)} />
        ))}
      </div>

      <Divider>{t("dividerEmail")}</Divider>

      <div className="flex flex-col gap-3.5">
        <div className="grid gap-2">
          <Label htmlFor="login-email">{t("emailLabel")}</Label>
          <Input
            id="login-email"
            type="text"
            autoComplete="username"
            value={email}
            placeholder={t("emailPlaceholder")}
            prefix={<Mail size={14} />}
            onChange={(e) => {
              setEmail(e.target.value);
              clearErrors();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !ssoActive) submitPassword();
            }}
          />
        </div>

        {ssoActive && tenant ? (
          <div className="pep-fade">
            <div className="mb-2.5 flex items-center gap-3 rounded-lg border border-line-default bg-surface-3 p-3.5">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-md font-mono text-md font-semibold text-white"
                style={{ background: tenant.accent }}
              >
                {tenant.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-md font-semibold">{tenant.partner}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-content-tertiary">
                  <ShieldCheck size={11} /> {t("sso.via", { provider: PROVIDERS[tenant.idp].label })}
                </div>
              </div>
              <Badge tone="success">{t("sso.badge")}</Badge>
            </div>
            <ProviderButton
              id={tenant.idp}
              label={providerLabel(tenant.idp)}
              sublabel={`${tenant.partner} · ${tenant.slug}.pep.io`}
              onClick={() => onEnterprise(tenant, email.trim())}
            />
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-content-tertiary">
              <Info size={11} /> {t("sso.manages")}
            </div>
          </div>
        ) : null}

        {ssoSuspended && tenant ? (
          <div className="flex items-center gap-2 rounded-md border border-warning-500/20 bg-warning-bg px-3 py-2 text-xs text-warning-strong">
            <TriangleAlert size={14} className="shrink-0" />
            <span>
              {t.rich("sso.suspended", {
                partner: tenant.partner,
                b: (c) => <strong className="font-semibold">{c}</strong>,
              })}
            </span>
          </div>
        ) : null}

        {!ssoActive ? (
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password">{t("passwordLabel")}</Label>
              <Button
                variant="link"
                onClick={() => router.push("/forgot-password")}
                className="text-xs"
              >
                {t("forgot")}
              </Button>
            </div>
            <Input
              id="login-password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              value={pw}
              placeholder={t("passwordPlaceholder")}
              prefix={<Lock size={14} />}
              suffix={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t("togglePassword")}
                  onClick={() => setShowPw((v) => !v)}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </Button>
              }
              onChange={(e) => {
                setPw(e.target.value);
                clearErrors();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitPassword();
              }}
            />
          </div>
        ) : null}

        {shownError ? <ErrorBanner>{shownError}</ErrorBanner> : null}
      </div>

      {!ssoActive ? (
        <Button
          block
          className="mt-4"
          iconRight={<ArrowRight size={15} />}
          disabled={!accountReady || pw.length < 6}
          onClick={submitPassword}
        >
          {t("submit")}
        </Button>
      ) : null}

      {/* <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-content-tertiary">
        <ShieldCheck size={11} />
        <span>{t("invitedOnly")}</span>
        <Button
          variant="link"
          onClick={() => router.push("/onboarding")}
          className="h-auto p-0 text-xs"
        >
          {t("haveInvite")}
        </Button>
      </div> */}

      {/* <p className="mt-3 text-center text-xs leading-snug text-content-tertiary">
        {t("demoHint", { accounts: DEMO_ACCOUNTS })}
      </p> */}
    </div>
  );
}
