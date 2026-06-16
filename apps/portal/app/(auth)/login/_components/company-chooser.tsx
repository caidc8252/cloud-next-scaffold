"use client";

import { Building2, ChevronRight } from "lucide-react";
import { Badge, Button } from "@cloud/ui";
import { useTranslations } from "@cloud/i18n/client";
import type { Account, Company } from "@/lib/mock/types";
import { AccountChip } from "@/app/_components/account-chip";
import { AuthLead, BackLink, IconBadge } from "@/app/(auth)/_components/card-bits";

export function CompanyChooser({
  account,
  companies,
  onSelect,
  onCancel,
}: {
  account: Account | null;
  companies: Company[];
  onSelect: (companyId: string) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("portal.login.company");
  return (
    <div>
      <BackLink onClick={onCancel}>{t("back")}</BackLink>
      <AuthLead
        crest={
          <IconBadge>
            <Building2 size={20} />
          </IconBadge>
        }
        eyebrow={t("eyebrow")}
        title={t("title")}
        sub={t("sub")}
      />
      <div className="mb-3.5">
        <AccountChip name={account?.name} email={account?.email} />
      </div>
      <div className="flex flex-col gap-2">
        {companies.map((c) => (
          <Button
            key={c.id}
            variant="outline"
            block
            size="auto"
            onClick={() => onSelect(c.id)}
            className="justify-start gap-3 px-3 py-3 font-normal"
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white"
              style={{ background: c.accent }}
            >
              {c.initials}
            </span>
            <span className="flex-1 text-left text-sm font-semibold">{c.name}</span>
            <Badge tone="info">{c.contract}</Badge>
            <ChevronRight size={15} className="text-content-tertiary" />
          </Button>
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-content-tertiary">{t("note")}</p>
    </div>
  );
}
