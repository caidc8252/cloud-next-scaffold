"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { Badge, Button, Input, Modal, toast } from "@cloud/ui/components/ui";
import { toastError } from "@cloud/request/error-toast";
import { useTranslations } from "@cloud/i18n/client";
import { disableAccountMfa, getAccountSecurity } from "@/service/account/api";
import type { AccountSecurity } from "@/app/(portal)/account/_shared/types";
import { UPCard, UPHeader, UPRow } from "./up-chrome";
import { PasswordChangeFlow } from "./password-change-flow";
import { MfaEnrollFlow } from "./mfa-enroll-flow";

export function AccountSecurityPageClient({ initialSecurity }: { initialSecurity: AccountSecurity }) {
  const t = useTranslations("account");
  const [security, setSecurity] = useState(initialSecurity);
  const [pwFlow, setPwFlow] = useState(false);
  const [enrollFlow, setEnrollFlow] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [disabling, setDisabling] = useState(false);

  const active = security.mfaStatus === "ACTIVE";

  // Stable "now" for the render (reading Date.now() during render is impure).
  const [now] = useState(() => Date.now());
  const days =
    security.passwordChangedTimestamp === null
      ? null
      : Math.floor((now - new Date(security.passwordChangedTimestamp).getTime()) / 86_400_000);
  const passwordSub =
    days === null
      ? t("security.password.metaUnknown")
      : t("security.password.meta", { days, expires: Math.max(0, security.passwordExpiryDays - days) });

  async function refresh() {
    try {
      const res = await getAccountSecurity();
      setSecurity(res.data);
    } catch {
      // non-fatal; the page keeps the last known state
    }
  }

  async function disable() {
    setDisabling(true);
    try {
      const res = await disableAccountMfa({ code: disableCode.trim() });
      setSecurity(res.data);
      setDisableOpen(false);
      setDisableCode("");
      toast.success(t("security.mfa.disabledToast"));
    } catch (e) {
      toastError(e);
    } finally {
      setDisabling(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <UPHeader icon={<Shield size={20} />} title={t("security.title")} sub={t("security.sub")} />

      <div className="flex flex-col gap-4">
        <UPCard title={t("security.signin.title")} sub={t("security.signin.sub")}>
          <UPRow
            title={t("security.password.title")}
            sub={passwordSub}
            trailing={
              <Button variant="secondary" onClick={() => setPwFlow(true)}>
                {t("security.changePassword")}
              </Button>
            }
          />
        </UPCard>

        <UPCard title={t("security.mfa.title")} sub={t("security.mfa.sub")}>
          <UPRow
            title={
              <>
                {t("security.authenticator.title")}
                <Badge tone={active ? "success" : "neutral"}>
                  {active ? t("security.authenticator.active") : t("security.authenticator.off")}
                </Badge>
              </>
            }
            sub={active ? t("security.authenticator.activeSub") : t("security.authenticator.offSub")}
            trailing={
              active ? (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEnrollFlow(true)}>
                    {t("security.reconfigure")}
                  </Button>
                  <Button variant="ghost-danger" size="sm" onClick={() => setDisableOpen(true)}>
                    {t("security.disable")}
                  </Button>
                </div>
              ) : (
                <Button variant="primary" size="sm" onClick={() => setEnrollFlow(true)}>
                  {t("security.enable")}
                </Button>
              )
            }
          />
        </UPCard>
      </div>

      {pwFlow && (
        <PasswordChangeFlow mfaEnable={security.mfaEnable} onClose={() => setPwFlow(false)} onDone={refresh} />
      )}
      {enrollFlow && (
        <MfaEnrollFlow reconfigure={active} onClose={() => setEnrollFlow(false)} onDone={(s) => setSecurity(s)} />
      )}

      <Modal
        open={disableOpen}
        onClose={() => !disabling && setDisableOpen(false)}
        size="sm"
        title={t("security.disableModal.title")}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDisableOpen(false)} disabled={disabling}>
              {t("mfa.cancel")}
            </Button>
            <Button variant="danger" loading={disabling} disabled={disableCode.length !== 6} onClick={disable}>
              {t("security.disable")}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-relaxed text-content-secondary">{t("security.disableModal.desc")}</p>
          <Input
            inputSize="lg"
            inputMode="numeric"
            maxLength={6}
            value={disableCode}
            autoFocus
            placeholder="000000"
            className="text-center font-mono text-lg tracking-widest"
            onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </div>
      </Modal>
    </div>
  );
}
