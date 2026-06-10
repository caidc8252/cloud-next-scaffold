"use client";

import { Check, Clock, Plus, RefreshCw, User } from "lucide-react";
import { Badge, Button } from "@cloud/ui";
import { useFormatter, useTranslations } from "@cloud/i18n/client";
import type { Account, Invitation } from "@/lib/mock/types";
import { initials } from "@/lib/format";
import { AuthLead, Divider } from "@/app/(auth)/_components/card-bits";
import { AccountRow, EntRow, ObCard } from "./ob-bits";

export function ObLanding({
  invitation,
  currentUser,
  onUseCurrent,
  onSignInOther,
  onSignIn,
  onRegister,
}: {
  invitation: Invitation;
  currentUser: Account | null;
  onUseCurrent: () => void;
  onSignInOther: () => void;
  onSignIn: () => void;
  onRegister: () => void;
}) {
  const t = useTranslations("portal.onboarding.landing");
  const format = useFormatter();

  return (
    <ObCard width="wide">
      <AuthLead
        eyebrow={t("eyebrow")}
        title={t("title", { partner: invitation.partner })}
        sub={t("sub")}
      />
      <EntRow
        initials={initials(invitation.partner)}
        name={invitation.partner}
        sub={t.rich("invitedBy", {
          by: invitation.invitedBy,
          contract: invitation.contract,
          b: (c) => <strong className="font-semibold text-content-secondary">{c}</strong>,
        })}
      />

      {currentUser ? (
        <>
          <Divider>{t("signedInAs")}</Divider>
          <AccountRow
            name={currentUser.name}
            email={currentUser.email}
            chip={<Badge tone="success">{t("current")}</Badge>}
          />
          <div className="mt-4 flex flex-col gap-2.5">
            <Button block iconLeft={<Check size={15} />} onClick={onUseCurrent}>
              {t("useThis")}
            </Button>
            <Button block variant="secondary" iconLeft={<RefreshCw size={15} />} onClick={onSignInOther}>
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
            <Button block iconLeft={<User size={15} />} onClick={onSignIn}>
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
            email: invitation.email,
            when: format.relativeTime(new Date(invitation.expiresAt)),
            b: (c) => <strong className="font-semibold text-content-secondary">{c}</strong>,
          })}
        </span>
      </div>
    </ObCard>
  );
}
