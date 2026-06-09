"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Modal } from "@cloud/ui";
import { request, RequestError } from "@cloud/request/client";
import { useTranslations } from "@cloud/i18n/client";
import { encryptLoginPassword } from "@/lib/login-crypto";

export function LoginForm() {
  const t = useTranslations("site.login.form");
  const router = useRouter();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaPending, setMfaPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setMessage(null);

    if (!account.trim() || !password) {
      setMessage(t("requiredMessage"));
      return;
    }

    setPending(true);
    try {
      const timestampResponse = await request.get<{ serverTimestamp: number }>(
        "/api/auth/server-time",
      );
      const encryptedPassword = await encryptLoginPassword(
        password,
        timestampResponse.data.serverTimestamp,
      );
      const response = await request.post<{
        redirectTo?: string;
        mfaRequired?: boolean;
        mfaToken?: string;
      }>("/api/auth/login", { account, encryptedPassword });

      // mfaToken 是服务端签发的内部临时票据，用户只需要输入认证器里的 6 位码。
      if (response.data.mfaRequired && response.data.mfaToken) {
        setMfaToken(response.data.mfaToken);
        setMfaCode("");
        setMfaError(null);
        setPending(false);
        return;
      }

      router.replace(response.data.redirectTo ?? "/select-partner");
      router.refresh();
    } catch (error) {
      setMessage(readRequestMessage(error, t("defaultError")));
      setPending(false);
    }
  }

  async function verifyMfa() {
    if (!mfaToken || mfaPending) return;

    setMfaError(null);
    setMfaPending(true);
    try {
      const response = await request.post<{ redirectTo?: string }>("/api/auth/mfa-verify", {
        mfaToken,
        code: mfaCode.trim(),
      });
      router.replace(response.data.redirectTo ?? "/select-partner");
      router.refresh();
    } catch (error) {
      setMfaError(readRequestMessage(error, t("mfaDefaultError")));
      setMfaPending(false);
    }
  }

  return (
    <>
      {message ? <div className="error-banner">{message}</div> : null}
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="field-grid">
          <Label htmlFor="site-login-account">{t("accountLabel")}</Label>
          <Input
            id="site-login-account"
            name="account"
            autoComplete="username"
            placeholder={t("accountPlaceholder")}
            value={account}
            onChange={(event) => {
              setAccount(event.target.value);
              setMessage(null);
            }}
          />
        </div>
        <div className="field-grid">
          <Label htmlFor="site-login-password">{t("passwordLabel")}</Label>
          <Input
            id="site-login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder={t("passwordPlaceholder")}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setMessage(null);
            }}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? t("pending") : t("submit")}
        </Button>
      </form>

      <Modal
        open={!!mfaToken}
        onClose={() => {
          if (!mfaPending) setMfaToken(null);
        }}
        size="sm"
        title={t("mfaTitle")}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setMfaToken(null)} disabled={mfaPending}>
              {t("mfaCancel")}
            </Button>
            <Button onClick={verifyMfa} disabled={mfaCode.length !== 6 || mfaPending}>
              {mfaPending ? t("mfaVerifying") : t("mfaVerify")}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-relaxed text-content-secondary">{t("mfaDescription")}</p>
          <Input
            inputSize="lg"
            inputMode="numeric"
            maxLength={6}
            value={mfaCode}
            autoFocus
            placeholder={t("mfaPlaceholder")}
            className="text-center font-mono text-lg tracking-widest"
            onChange={(event) => {
              setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6));
              setMfaError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && mfaCode.length === 6) void verifyMfa();
            }}
          />
          {mfaError ? <p className="text-xs text-error-strong">{mfaError}</p> : null}
        </div>
      </Modal>
    </>
  );
}

function readRequestMessage(error: unknown, fallback: string): string {
  return error instanceof RequestError ? (error.body?.message ?? fallback) : fallback;
}
