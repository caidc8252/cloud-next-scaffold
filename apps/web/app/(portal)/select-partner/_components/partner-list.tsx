"use client";

import { useState } from "react";
import { ArrowRight, Building2, Loader2 } from "lucide-react";
import { Badge, Button } from "@cloud/ui";
import { RequestError } from "@cloud/request/client";
import { useTranslations } from "@cloud/i18n/client";
import { selectPartner as selectPartnerApi } from "@/modules/identity/auth/client/auth.api";
import { isPartySelectable, type PartyChoice } from "@/modules/identity/auth/server/partner-choice";

export function PartnerList({ choices }: { choices: PartyChoice[] }) {
  const t = useTranslations("portal.partner");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function reasonFor(choice: PartyChoice): string | null {
    if (choice.partnerStatus !== "ACTIVE") return t("reason.partnerDisabled");
    if (choice.userStatus !== "ACTIVE") return t("reason.userDisabled");
    if (!choice.validContract) return t("reason.noContract");
    return null;
  }

  async function selectPartner(partyId: number) {
    if (pendingId !== null) return;

    setPendingId(partyId);
    setMessage(null);
    try {
      const response = await selectPartnerApi({ partyId });
      window.location.assign(response.data.redirectTo);
    } catch (error) {
      setMessage(
        error instanceof RequestError
          ? (error.body?.message ?? t("defaultError"))
          : t("defaultError"),
      );
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {message ? (
        <div className="rounded-md border border-error-500/20 bg-error-bg px-3 py-2 text-md text-error-strong">
          {message}
        </div>
      ) : null}
      {choices.map((choice) => {
        const selectable = isPartySelectable(choice);
        const reason = reasonFor(choice);
        const isPending = pendingId === choice.partyId;

        return (
          <Button
            key={choice.partyId}
            type="button"
            size="auto"
            variant="secondary"
            block
            disabled={!selectable || pendingId !== null}
            onClick={() => void selectPartner(choice.partyId)}
            className="justify-start gap-3 p-3 font-normal"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-content-secondary">
              <Building2 size={18} />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-md font-semibold text-content-primary">
                {choice.partyName}
              </span>
              {reason ? (
                <span className="mt-0.5 block text-xs text-content-tertiary">{reason}</span>
              ) : null}
            </span>
            <Badge tone={selectable ? "success" : "neutral"}>
              {choice.authorizingType === "ADMIN" ? t("badge.admin") : t("badge.normal")}
            </Badge>
            {isPending ? (
              <Loader2 size={15} className="animate-spin text-content-tertiary" />
            ) : (
              <ArrowRight size={15} className="text-content-tertiary" />
            )}
          </Button>
        );
      })}
    </div>
  );
}
