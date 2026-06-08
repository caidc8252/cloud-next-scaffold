"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "@cloud/i18n/client";
import { Badge } from "@cloud/ui";
import { request } from "@cloud/request/client";
import { toastError } from "@cloud/request/error-toast";
import { isPartnerSelectable, type PartnerChoice } from "@/service/auth/partner-choice";

export function PartnerList({ choices }: { choices: PartnerChoice[] }) {
  const t = useTranslations("auth.selectPartner");
  const router = useRouter();
  const [pendingId, setPendingId] = useState<number | null>(null);

  if (choices.length === 0) {
    return <p className="login-note">{t("empty")}</p>;
  }

  async function select(partnerId: number) {
    if (pendingId !== null) return;
    setPendingId(partnerId);
    try {
      await request.post("/api/auth/select-partner", { partnerId });
      router.replace("/");
      router.refresh();
    } catch (err) {
      toastError(err);
      setPendingId(null);
    }
  }

  // 不可选理由：按字段派生（partner 停用 > 用户停用 > 无有效合同）。
  function reasonFor(choice: PartnerChoice): string | null {
    if (choice.partnerStatus !== "ACTIVE") return t("reason.partnerDisabled");
    if (choice.userStatus !== "ACTIVE") return t("reason.userDisabled");
    if (!choice.validContract) return t("reason.noContract");
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {choices.map((choice) => {
        const selectable = isPartnerSelectable(choice);
        const reason = reasonFor(choice);
        return (
          <button
            key={choice.partnerId}
            type="button"
            disabled={!selectable || pendingId !== null}
            onClick={() => select(choice.partnerId)}
            className="w-full text-left px-4 py-3 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-hover border-line-default"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-content-primary">{choice.partnerName}</span>
              <Badge variant={selectable ? "default" : "outline"}>
                {choice.authorizingType === "ADMIN" ? t("badge.admin") : t("badge.normal")}
              </Badge>
            </div>
            {reason && <span className="mt-1 block text-xs text-content-secondary">{reason}</span>}
          </button>
        );
      })}
    </div>
  );
}
