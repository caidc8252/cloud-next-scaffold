"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@cloud/ui";
import { RequestError } from "@cloud/request/client";
import { useTranslations } from "@cloud/i18n/client";
import type { Account, AuthBlockType, Company, MfaProfile, ProviderId, SsoTenant } from "@/lib/auth-ui-types";
import {
  getLoginChallenge,
  loginWithOidc,
  loginWithPassword,
  selectLoginCompany,
  verifyMfa as verifyMfaApi,
} from "@/modules/identity/auth/client/auth.api";
import type { LoginResponse, PasswordLoginResponse } from "@/modules/identity/auth/client/auth.api";
import { AuthShell } from "@/app/_components/auth-shell";
import { PROVIDERS } from "@/app/_components/provider-mark";
import { encryptLoginPassword } from "@/lib/login-crypto";
import { LoginForm } from "./login-form";
import { IdpConsent } from "./idp-consent";
import { MfaChallenge } from "./mfa-challenge";
import { CompanyChooser } from "./company-chooser";
import { AuthBlocked, NoCompany } from "./auth-states";

type Step = "form" | "idp" | "mfa" | "company" | "blocked" | "nocompany";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const deriveName = (email: string) =>
  (email.split("@")[0] || "operator").replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function LoginScreen({ returnTo }: { returnTo?: string }) {
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

  async function enterConsole(redirectTo = "/select-partner") {
    setBusy(t("busy.entering"));
    await delay(500);
    if (redirectTo.startsWith("http://") || redirectTo.startsWith("https://")) {
      window.location.assign(redirectTo);
      return;
    }
    router.replace(redirectTo);
    router.refresh();
  }

  async function applyPasswordResult(data: PasswordLoginResponse, accountName: string) {
    if (data.mfaRequired && data.mfaToken) {
      setBusy(null);
      setAccount({ name: deriveName(accountName), email: accountName });
      setLoginToken(data.mfaToken);
      setMfaError(null);
      setMfa(undefined);
      setStep("mfa");
      return;
    }

    await enterConsole(data.redirectTo ?? "/select-partner");
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
      const challenge = await getLoginChallenge();
      const encryptedPassword = await encryptLoginPassword(
        password,
        challenge.data.serverTimestamp,
        challenge.data.nonce,
      );
      const res = await loginWithPassword({
        email,
        encryptedPassword,
        ...(returnTo ? { returnTo } : {}),
      });
      await applyPasswordResult(res.data, email);
    } catch (e) {
      setBusy(null);
      setFormError(e instanceof RequestError ? (e.body?.message ?? t("errors.generic")) : t("errors.generic"));
    }
  }

  // 第三方 / 企业 SSO 登录尚未接入：点击直接 toast 提示暂不支持，不再进入
  // mock 的 IdP 授权流程（下方 "idp" step 与 chooseAccount 暂留作占位，当前不可达）。
  function notifySsoUnavailable() {
    toast.info(t("ssoUnavailable"));
  }

  async function chooseAccount(acct: { name: string; email: string; sub: string }) {
    if (!provider) return;
    setBusy(t("busy.returning", { provider: PROVIDERS[provider].label }));
    try {
      await delay(800);
      const res = await loginWithOidc({
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
      const res = await verifyMfaApi({ mfaToken: loginToken ?? "", code });
      const data = res.data;
      if (data.redirectTo && !data.status) return enterConsole(data.redirectTo);
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
      const res = await selectLoginCompany({ loginToken, companyId });
      router.replace(res.data.redirectTo ?? "/select-partner");
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
        onProvider={notifySsoUnavailable}
        onEnterprise={notifySsoUnavailable}
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
