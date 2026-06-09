"use client";

import { useState } from "react";
import { ArrowRight, Building2, Loader2 } from "lucide-react";
import { Badge, Button } from "@cloud/ui";
import { useTranslations } from "@cloud/i18n/client";
import { request, RequestError } from "@cloud/request/client";

type PartnerOption = {
  partnerId: number;
  partnerName: string;
  active: boolean;
};

type SelectPartnerResponse = {
  redirectTo: string;
};

export function PartnerList({ partners }: { partners: PartnerOption[] }) {
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

  return (
    <div className="site-partner-list">
      {message ? <div className="site-login-message">{message}</div> : null}
      {partners.map((partner) => {
        const isPending = pendingId === partner.partnerId;

        return (
          <Button
            key={partner.partnerId}
            type="button"
            variant="outline"
            className="site-partner-option"
            disabled={!partner.active || pendingId !== null}
            onClick={() => void selectPartner(partner.partnerId)}
          >
            <span className="site-partner-option__identity">
              <Building2 size={19} aria-hidden="true" />
              <span>{partner.partnerName}</span>
            </span>
            <span className="site-partner-option__status">
              <Badge tone={partner.active ? "success" : "neutral"} dot>
                {partner.active ? t("active") : t("disabled")}
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
