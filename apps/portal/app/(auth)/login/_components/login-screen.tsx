"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { request, RequestError } from "@cloud/request/client";
import { useTranslations } from "@cloud/i18n/client";
import type { Account, AuthBlockType, Company, LoginResult, MfaProfile, ProviderId, SsoTenant } from "@/lib/mock/types";
import { AuthShell } from "@/app/_components/auth-shell";
import { PROVIDERS } from "@/app/_components/provider-mark";
import { LoginForm } from "./login-form";
import { IdpConsent } from "./idp-consent";
import { MfaChallenge } from "./mfa-challenge";
import { CompanyChooser } from "./company-chooser";
import { AuthBlocked, NoCompany } from "./auth-states";

type Step = "form" | "idp" | "mfa" | "company" | "blocked" | "nocompany";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const deriveName = (email: string) =>
  (email.split("@")[0] || "operator").replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

type LoginResponse = LoginResult & { redirectTo?: string };
type MfaResponse =
  | { status: "ok"; redirectTo?: string }
  | { status: "company"; companies?: Company[] }
  | { status: "wrong"; triesLeft?: number }
  | { status: "blocked" };

export function LoginScreen() {
  const t = useTranslations("portal.login");
  const router = useRouter();

  const [step, setStep] = useState<Step>("form");
  const [busy, setBusy] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderId | null>(null);
  const [tenant, setTenant] = useState<SsoTenant | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [loginToken, setLoginToken] = useState<string | null>(null);
  const [mfa, setMfa] = useState<MfaProfile | undefined>(undefined);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [blockedType, setBlockedType] = useState<AuthBlockType>("locked");

  function reset() {
    setStep("form");
    setProvider(null);
    setTenant(null);
    setAccount(null);
    setLoginToken(null);
    setMfa(undefined);
    setCompanies([]);
    setMfaError(null);
    setFormError(null);
  }

  async function enterConsole(redirectTo = "/dashboard") {
    setBusy(t("busy.entering"));
    await delay(500);
    router.replace(redirectTo);
    router.refresh();
  }

  function applyResult(data: LoginResponse, email: string) {
    if (data.status === "ok") return enterConsole(data.redirectTo);
    setBusy(null);
    if (data.status === "mfa") {
      setAccount(data.account ?? { name: deriveName(email), email });
      setLoginToken(data.mfaToken ?? null);
      setMfa(data.mfa);
      setMfaError(null);
      setStep("mfa");
    } else if (data.status === "company") {
      setAccount(data.account ?? { name: deriveName(email), email });
      setLoginToken(data.mfaToken ?? null);
      setCompanies(data.companies ?? []);
      setStep("company");
    } else if (data.status === "nocompany") {
      setAccount(data.account ?? { name: deriveName(email), email });
      setStep("nocompany");
    } else if (data.status === "blocked") {
      setBlockedType(data.blocked ?? "locked");
      setStep("blocked");
    }
  }

  async function handlePassword(email: string, password: string) {
    setFormError(null);
    setBusy(t("busy.verifying"));
    try {
      await delay(600);
      const res = await request.post<LoginResponse>("/api/auth/password", { email, password });
      await applyResult(res.data, email);
    } catch (e) {
      setBusy(null);
      setFormError(e instanceof RequestError && e.body?.code ? e.body.code : "generic");
    }
  }

  function startProvider(id: ProviderId) {
    setProvider(id);
    setTenant(null);
    setAccount(null);
    setStep("idp");
  }

  function startEnterprise(tn: SsoTenant, email: string) {
    setProvider(tn.idp);
    setTenant(tn);
    setAccount({ name: deriveName(email), email, sub: `${tn.idp}-00u4f7` });
    setStep("idp");
  }

  async function chooseAccount(acct: { name: string; email: string; sub: string }) {
    if (!provider) return;
    setBusy(t("busy.returning", { provider: PROVIDERS[provider].label }));
    try {
      await delay(800);
      const res = await request.post<LoginResponse>("/api/auth/oidc", {
        provider,
        email: acct.email,
        name: acct.name,
        sub: acct.sub,
        mode: tenant ? "enterprise" : "sso",
      });
      setAccount({ name: acct.name, email: acct.email, sub: acct.sub });
      await applyResult(res.data, acct.email);
    } catch {
      setBusy(null);
      reset();
    }
  }

  async function verifyMfa(code: string) {
    setMfaError(null);
    try {
      const res = await request.post<MfaResponse>("/api/auth/mfa", { loginToken, code });
      const data = res.data;
      if (data.status === "ok") return enterConsole(data.redirectTo);
      if (data.status === "company") {
        setCompanies(data.companies ?? []);
        setStep("company");
      } else if (data.status === "blocked") {
        setBlockedType("mfa");
        setStep("blocked");
      } else if (data.status === "wrong") {
        setMfaError(t("mfa.errWrong", { count: data.triesLeft ?? 0 }));
      }
    } catch {
      setMfaError(t("mfa.errEnter"));
    }
  }

  async function selectCompany(companyId: string) {
    setBusy(t("busy.entering"));
    try {
      await delay(500);
      const res = await request.post<LoginResponse>("/api/auth/company", { loginToken, companyId });
      router.replace(res.data.redirectTo ?? "/dashboard");
      router.refresh();
    } catch {
      setBusy(null);
      reset();
    }
  }

  let content;
  if (step === "form") {
    content = (
      <LoginForm
        serverError={formError}
        onClearError={() => setFormError(null)}
        onPassword={handlePassword}
        onProvider={startProvider}
        onEnterprise={startEnterprise}
      />
    );
  } else if (step === "idp" && provider) {
    content = (
      <IdpConsent provider={provider} tenant={tenant} account={account} onChoose={chooseAccount} onCancel={reset} />
    );
  } else if (step === "mfa") {
    content = <MfaChallenge account={account} mfa={mfa} error={mfaError} onVerify={verifyMfa} onCancel={reset} />;
  } else if (step === "company") {
    content = <CompanyChooser account={account} companies={companies} onSelect={selectCompany} onCancel={reset} />;
  } else if (step === "blocked") {
    content = <AuthBlocked type={blockedType} onBack={reset} />;
  } else if (step === "nocompany") {
    content = <NoCompany account={account} onBack={reset} onInvite={() => router.push("/onboarding")} />;
  }

  return (
    <AuthShell busy={busy} showBrand={step === "form"}>
      {content}
    </AuthShell>
  );
}
