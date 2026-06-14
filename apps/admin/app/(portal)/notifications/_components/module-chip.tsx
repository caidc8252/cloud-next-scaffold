"use client";

import { useTranslations } from "@cloud/i18n/client";
import type { NoticeModule } from "@/service/notification/types";
import { MODULE_META } from "../_lib/notice-meta";

/** Small module pill: tinted icon + label (e.g. a blue "Tickets" chip). */
export function ModuleChip({ module }: { module: NoticeModule }) {
  const t = useTranslations("notifications");
  const meta = MODULE_META[module];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-medium ${meta.chip}`}
    >
      <Icon className="size-3" />
      {t(meta.labelKey)}
    </span>
  );
}
