"use client";

import { Activity, Download } from "lucide-react";
import { Button } from "@cloud/ui/components/ui";
import { useTranslations } from "@cloud/i18n/client";
import type { ActivityGroup, ActivityTone } from "@/app/(portal)/account/_shared/types";
import { AccountIcon } from "./account-icon";
import { UPCard, UPHeader } from "./up-chrome";

const TONE_DOT: Record<ActivityTone, string> = {
  info: "bg-info-bg text-info-strong",
  success: "bg-success-bg text-success-strong",
  warning: "bg-warning-bg text-warning-strong",
};

function toCsv(groups: ActivityGroup[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = [["day", "time", "title", "detail"]];
  for (const g of groups) for (const it of g.items) rows.push([g.day, it.time, it.title, it.sub]);
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

export function ActivityPageClient({ initialGroups }: { initialGroups: ActivityGroup[] }) {
  const t = useTranslations("account");

  function exportCsv() {
    const blob = new Blob([toCsv(initialGroups)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-activity.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <UPHeader
        icon={<Activity size={20} />}
        title={t("activity.title")}
        sub={t("activity.sub")}
        actions={
          <Button variant="ghost" iconLeft={<Download size={16} />} onClick={exportCsv}>
            {t("activity.export")}
          </Button>
        }
      />

      <UPCard>
        <div className="flex flex-col">
          {initialGroups.map((g) => (
            <div key={g.day} className="border-b border-line-subtle px-5 py-4 last:border-b-0">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-content-tertiary">{g.day}</div>
              <div className="flex flex-col gap-3">
                {g.items.map((it, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className={`flex size-7 flex-none items-center justify-center rounded-full ${TONE_DOT[it.tone]}`}>
                      <AccountIcon name={it.icon} size={13} />
                    </span>
                    <span className="w-12 flex-none pt-1 text-xs tabular-nums text-content-tertiary">{it.time}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-content-primary">{it.title}</span>
                      <span className="block text-xs text-content-tertiary">{it.sub}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </UPCard>
    </div>
  );
}
