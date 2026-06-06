"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@cloud/ui";
import { request, RequestError } from "@cloud/request/client";
import { encryptLoginPassword } from "@/lib/login-crypto";

export function LoginForm() {
  const router = useRouter();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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

      if (res.data.mfaRequired) {
        router.replace("/mfa");
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
    </>
  );
}
