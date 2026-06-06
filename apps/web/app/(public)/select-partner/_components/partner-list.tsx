"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@cloud/ui";
import { request } from "@cloud/request/client";
import { toastError } from "@cloud/request/error-toast";

type PartnerOption = {
  partnerId: number;
  partnerName: string;
  active: boolean;
};

export function PartnerList({ partners }: { partners: PartnerOption[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<number | null>(null);

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

  return (
    <div className="flex flex-col gap-2">
      {partners.map((partner) => (
        <button
          key={partner.partnerId}
          type="button"
          disabled={!partner.active || pendingId !== null}
          onClick={() => select(partner.partnerId)}
          className="w-full text-left px-4 py-3 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-hover border-line-default"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-content-primary">{partner.partnerName}</span>
            <Badge variant={partner.active ? "default" : "outline"}>
              {partner.active ? "Active" : "Disabled"}
            </Badge>
          </div>
        </button>
      ))}
    </div>
  );
}
