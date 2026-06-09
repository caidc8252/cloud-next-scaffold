"use client";

import { Check } from "lucide-react";
import { Badge, Button } from "@cloud/ui";
import { useTranslations } from "@cloud/i18n/client";
import type { Invitation } from "@/lib/mock/types";
import { initials } from "@/lib/format";
import { AuthLead, BackLink, Divider } from "@/app/(auth)/_components/card-bits";
import { AccountRow, EntRow, ObCard } from "./ob-bits";

export function ObConfirm({
  invitation,
  account,
  viaExisting,
  onBack,
  onAuthorize,
  busy,
}: {
  invitation: Invitation;
  account: { name: string; email: string };
  viaExisting: boolean;
  onBack: () => void;
  onAuthorize: () => void;
  busy: boolean;
}) {
  const t = useTranslations("portal.onboarding.confirm");
  const tob = useTranslations("portal.onboarding");
  const tRoles = useTranslations("portal.roles");
  const roles = invitation.roles.map((r) => tRoles(r)).join(" · ");

  return (
    <ObCard width="wide">
      <BackLink onClick={onBack}>{tob("back")}</BackLink>
      <AuthLead eyebrow={t("eyebrow")} title={t("title", { partner: invitation.partner })} sub={t("sub")} />
      <EntRow
        initials={initials(invitation.partner)}
        name={invitation.partner}
        sub={t("preassigned", { roles })}
        trailing={<Badge tone="info">{invitation.contract}</Badge>}
      />
      <Divider>{t("joiningAs")}</Divider>
      <AccountRow
        name={account.name}
        email={account.email}
        chip={
          viaExisting ? (
            <Badge tone="success">{t("existing")}</Badge>
          ) : (
            <Badge tone="info">{t("new")}</Badge>
          )
        }
      />
      <div className="mt-6 flex justify-end gap-2.5">
        <Button variant="ghost" onClick={onBack}>
          {t("decline")}
        </Button>
        <Button loading={busy} iconLeft={busy ? undefined : <Check size={15} />} onClick={onAuthorize}>
          {t("authorize")}
        </Button>
      </div>
    </ObCard>
  );
}
