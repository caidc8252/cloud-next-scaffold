"use client";

import { useState } from "react";
import { Check, Clock, Plus, RefreshCw, User } from "lucide-react";
import { Button } from "@cloud/ui";
import { RequestError } from "@cloud/request/client";
import { useFormatter, useTranslations } from "@cloud/i18n/client";
import type { CurrentUser, InvitePublic } from "./types";
import { initials } from "@/lib/format";
import { AuthLead, Divider, ErrorBanner } from "@/app/(public)/_components/card-bits";
import { AccountRow, EntRow, ObCard } from "./ob-bits";

export function ObLanding({
  invite,
  currentUser,
  onJoinCurrent,
  onLogin,
  onSwitch,
  onRegister,
}: {
  invite: InvitePublic;
  currentUser: CurrentUser | null;
  onJoinCurrent: () => Promise<void>;
  onLogin: () => void;
  onSwitch: () => void;
  onRegister: () => void;
}) {
  const t = useTranslations("portal.onboarding.landing");
  const format = useFormatter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [now] = useState(Date.now);

  async function join() {
    setErr("");
    setBusy(true);
    try {
      await onJoinCurrent();
    } catch (e) {
      setErr(e instanceof RequestError ? (e.body?.message ?? t("error")) : t("error"));
      setBusy(false);
    }
  }

  return (
    <ObCard width="wide">
      <AuthLead eyebrow={t("eyebrow")} title={t("title", { partner: invite.partyName })} sub={t("sub")} />
      <EntRow initials={initials(invite.partyName)} name={invite.partyName} />

      {currentUser ? (
        <>
          <Divider>{t("signedInAs")}</Divider>
          <AccountRow name={currentUser.displayName ?? currentUser.email} email={currentUser.email} />
          {err ? <div className="mt-3"><ErrorBanner>{err}</ErrorBanner></div> : null}
          <div className="mt-4 flex flex-col gap-2.5">
            <Button block loading={busy} iconLeft={busy ? undefined : <Check size={15} />} onClick={join}>
              {t("useThis")}
            </Button>
            <Button block variant="secondary" iconLeft={<RefreshCw size={15} />} onClick={onSwitch}>
              {t("signOutOther")}
            </Button>
            <Button block variant="ghost" iconLeft={<Plus size={15} />} onClick={onRegister}>
              {t("registerNew")}
            </Button>
          </div>
        </>
      ) : (
        <>
          <Divider>{t("continueWith")}</Divider>
          <div className="flex flex-col gap-2.5">
            <Button block iconLeft={<User size={15} />} onClick={onLogin}>
              {t("signInExisting")}
            </Button>
            <Button block variant="secondary" iconLeft={<Plus size={15} />} onClick={onRegister}>
              {t("registerNew")}
            </Button>
          </div>
        </>
      )}

      <div className="mt-5 flex items-center gap-1.5 text-xs text-content-tertiary">
        <Clock size={11} />
        <span>
          {t.rich("expires", {
            email: invite.inviteEmail,
            when: format.relativeTime(new Date(invite.expiresAt), now),
            b: (c) => <strong className="font-semibold text-content-secondary">{c}</strong>,
          })}
        </span>
      </div>
    </ObCard>
  );
}
