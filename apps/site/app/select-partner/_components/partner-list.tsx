"use client";

import { useState } from "react";
import { ArrowRight, Building2, Loader2 } from "lucide-react";
import { Badge, Button } from "@cloud/ui";
import { useTranslations } from "@cloud/i18n/client";
import { request, RequestError } from "@cloud/request/client";
import { isPartnerSelectable, type PartnerChoice } from "@/lib/partner-choice";

type SelectPartnerResponse = {
  redirectTo: string;
};

export function PartnerList({ choices }: { choices: PartnerChoice[] }) {
  const t = useTranslations("site.partner");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function selectPartner(partnerId: number) {
    if (pendingId !== null) return;

    setPendingId(partnerId);
    setMessage(null);
    try {
      const response = await request.post<SelectPartnerResponse>("/api/auth/select-partner", {
        partnerId,
      });
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

  function reasonFor(choice: PartnerChoice): string | null {
    if (choice.partnerStatus !== "ACTIVE") return t("reason.partnerDisabled");
    if (choice.userStatus !== "ACTIVE") return t("reason.userDisabled");
    if (!choice.validContract) return t("reason.noContract");
    return null;
  }

  return (
    <div className="site-partner-list">
      {message ? <div className="site-login-message">{message}</div> : null}
      {choices.map((choice) => {
        const isPending = pendingId === choice.partnerId;
        const selectable = isPartnerSelectable(choice);
        const reason = reasonFor(choice);

        return (
          <Button
            key={choice.partnerId}
            type="button"
            variant="outline"
            className="site-partner-option"
            disabled={!selectable || pendingId !== null}
            onClick={() => void selectPartner(choice.partnerId)}
          >
            <span className="site-partner-option__identity">
              <Building2 size={19} aria-hidden="true" />
              <span>
                <span>{choice.partnerName}</span>
                {reason ? <span className="site-partner-reason">{reason}</span> : null}
              </span>
            </span>
            <span className="site-partner-option__status">
              <Badge tone={selectable ? "success" : "neutral"} dot>
                {choice.authorizingType === "ADMIN" ? t("badge.admin") : t("badge.normal")}
              </Badge>
              {isPending ? (
                <Loader2 className="site-partner-spinner" size={18} aria-hidden="true" />
              ) : (
                <ArrowRight size={18} aria-hidden="true" />
              )}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
