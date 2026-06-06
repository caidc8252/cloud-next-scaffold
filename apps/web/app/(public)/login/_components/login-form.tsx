"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@cloud/ui";
import { Modal } from "@cloud/ui/components/ui";
import { request, RequestError } from "@cloud/request/client";
import { encryptLoginPassword } from "@/lib/login-crypto";

export function LoginForm() {
  const router = useRouter();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // MFA second stage (modal) — opened when the password stage returns mfaRequired.
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaPending, setMfaPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const tsRes = await request.get<{ serverTimestamp: number }>("/api/auth/server-time");
      const encryptedPassword = await encryptLoginPassword(password, tsRes.data.serverTimestamp);
      const res = await request.post<{
        redirectTo?: string;
        mfaRequired?: boolean;
        mfaToken?: string;
      }>("/api/auth/login", { account, encryptedPassword });

      if (res.data.mfaRequired && res.data.mfaToken) {
        setMfaToken(res.data.mfaToken);
        setMfaCode("");
        setMfaError(null);
        setPending(false);
        return;
      }

      router.replace(res.data.redirectTo ?? "/");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof RequestError
          ? (err.body?.message ?? "Sign in failed. Please try again.")
          : "Sign in failed. Please try again.";
      setError(message);
      setPending(false);
    }
  }

  async function verifyMfa() {
    if (!mfaToken || mfaPending) return;
    setMfaError(null);
    setMfaPending(true);
    try {
      const res = await request.post<{ redirectTo?: string }>("/api/auth/mfa-verify", {
        mfaToken,
        code: mfaCode.trim(),
      });
      router.replace(res.data.redirectTo ?? "/");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof RequestError
          ? (err.body?.message ?? "Verification failed. Please try again.")
          : "Verification failed. Please try again.";
      setMfaError(message);
      setMfaPending(false);
    }
  }

  return (
    <>
      {error ? <div className="error-banner">{error}</div> : null}
      <form onSubmit={handleSubmit} className="form-grid">
        <div className="field-grid">
          <Label htmlFor="account">Account</Label>
          <Input
            id="account"
            name="account"
            autoComplete="username"
            placeholder="admin"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          />
        </div>
        <div className="field-grid">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="ChangeMe!123"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <Modal
        open={!!mfaToken}
        onClose={() => !mfaPending && setMfaToken(null)}
        size="sm"
        title="Two-factor verification"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setMfaToken(null)} disabled={mfaPending}>
              Cancel
            </Button>
            <Button onClick={verifyMfa} disabled={mfaCode.length !== 6 || mfaPending}>
              {mfaPending ? "Verifying…" : "Verify"}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-relaxed text-content-secondary">
            Enter the 6-digit code from your authenticator app to finish signing in.
          </p>
          <Input
            inputSize="lg"
            inputMode="numeric"
            maxLength={6}
            value={mfaCode}
            autoFocus
            placeholder="000000"
            className="text-center font-mono text-lg tracking-widest"
            onChange={(e) => {
              setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6));
              setMfaError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && mfaCode.length === 6) void verifyMfa();
            }}
          />
          {mfaError ? <p className="text-xs text-error-strong">{mfaError}</p> : null}
        </div>
      </Modal>
    </>
  );
}
