"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { Badge, Button, Switch, toast } from "@cloud/ui/components/ui";
import { request } from "@cloud/request/client";
import { toastError } from "@cloud/request/error-toast";
import { useTranslations } from "@cloud/i18n/client";
import type { SecurityState } from "@/app/(portal)/account/_shared/types";
import { UPCard, UPHeader, UPRow } from "./up-chrome";
import { PasswordChangeFlow } from "./password-change-flow";
import { AuthenticatorReconfigureFlow } from "./authenticator-reconfigure-flow";

const SMS_NUMBER = "+1 (415) ••• 0142";

export function AccountSecurityPageClient({ initialSecurity }: { initialSecurity: SecurityState }) {
  const t = useTranslations("account");
  const [security, setSecurity] = useState<SecurityState>(initialSecurity);
  const [pwFlow, setPwFlow] = useState(false);
  const [authReconfig, setAuthReconfig] = useState(false);

  const mfaEnabled = true; // authenticator app is always the active factor in this demo
  const mfaLabel = security.authenticator.app;

  async function patchToggle(patch: { magicLink?: boolean; smsBackup?: boolean }) {
    // optimistic
    setSecurity((s) => ({ ...s, ...patch }));
    try {
      const res = await request.patch<SecurityState>("/api/account/security", patch);
      setSecurity(res.data);
    } catch (err) {
      setSecurity(initialSecurity);
      toastError(err);
    }
  }

  async function finishPassword() {
    try {
      const res = await request.post<SecurityState>("/api/account/security/password");
      setSecurity(res.data);
      toast.success(t("security.toast.passwordChanged"));
    } catch (err) {
      toastError(err);
    }
  }

  async function finishAuthenticator() {
    try {
      const res = await request.post<SecurityState>("/api/account/security/mfa/authenticator");
      setSecurity(res.data);
      toast.success(t("security.toast.authReconfigured"));
    } catch (err) {
      toastError(err);
    }
  }

  async function revokeTokens() {
    try {
      const res = await request.post<SecurityState>("/api/account/security/revoke-tokens");
      setSecurity(res.data);
      toast.error(t("security.toast.tokensRevoked"));
    } catch (err) {
      toastError(err);
    }
  }

  const authMeta = security.authenticator.reconfiguredAt
    ? `${security.authenticator.app} · ${t("security.authenticator.reconfigured", { when: security.authenticator.reconfiguredAt })}`
    : `${security.authenticator.app} · ${security.authenticator.addedLabel}`;

  return (
    <div className="mx-auto max-w-3xl">
      <UPHeader icon={<Shield size={20} />} title={t("security.title")} sub={t("security.sub")} />

      <div className="flex flex-col gap-4">
        {/* Sign-in */}
        <UPCard title={t("security.signin.title")} sub={t("security.signin.sub")}>
          <UPRow
            title={t("security.password.title")}
            sub={t("security.password.meta", {
              days: security.password.lastChangedDaysAgo,
              expires: security.password.expiresInDays,
            })}
            trailing={
              <Button variant="secondary" onClick={() => setPwFlow(true)}>
                {t("security.changePassword")}
              </Button>
            }
          />
          <UPRow
            title={t("security.magicLink.title")}
            sub={t("security.magicLink.sub")}
            trailing={<Switch checked={security.magicLink} onCheckedChange={(v) => patchToggle({ magicLink: v })} />}
          />
        </UPCard>

        {/* Multi-factor */}
        <UPCard title={t("security.mfa.title")} sub={t("security.mfa.sub")}>
          <UPRow
            title={
              <>
                {t("security.authenticator.title")}
                <Badge tone="success">{t("security.authenticator.active")}</Badge>
              </>
            }
            sub={authMeta}
            trailing={
              <Button variant="ghost" size="sm" onClick={() => setAuthReconfig(true)}>
                {t("security.reconfigure")}
              </Button>
            }
          />
          <UPRow
            title={t("security.sms.title")}
            sub={SMS_NUMBER}
            trailing={<Switch checked={security.smsBackup} onCheckedChange={(v) => patchToggle({ smsBackup: v })} />}
          />
        </UPCard>

        {/* Connected services */}
        <UPCard title={t("security.connected.title")} sub={t("security.connected.sub")}>
          {security.connectedServices.map((svc) => (
            <UPRow
              key={svc.name}
              title={
                <>
                  {svc.name}
                  {svc.on && <Badge tone="success">{t("security.connected.linked")}</Badge>}
                </>
              }
              sub={svc.sub}
              trailing={
                <Button variant="ghost" size="sm" onClick={() => toast(t("security.toast.opening", { name: svc.name }))}>
                  {svc.on ? t("security.manage") : t("security.connect")}
                </Button>
              }
            />
          ))}
        </UPCard>

        {/* Danger zone */}
        <UPCard title={t("security.danger.title")} danger>
          <UPRow
            title={t("security.revoke.title")}
            sub={t("security.revoke.sub", { count: security.apiTokenCount })}
            trailing={
              <Button variant="danger" size="sm" disabled={security.apiTokenCount === 0} onClick={revokeTokens}>
                {t("security.revokeBtn")}
              </Button>
            }
          />
        </UPCard>
      </div>

      {pwFlow && (
        <PasswordChangeFlow
          mfaEnabled={mfaEnabled}
          mfaLabel={mfaLabel}
          onClose={() => setPwFlow(false)}
          onDone={finishPassword}
        />
      )}
      {authReconfig && (
        <AuthenticatorReconfigureFlow
          appName={security.authenticator.app}
          onClose={() => setAuthReconfig(false)}
          onDone={finishAuthenticator}
        />
      )}
    </div>
  );
}
