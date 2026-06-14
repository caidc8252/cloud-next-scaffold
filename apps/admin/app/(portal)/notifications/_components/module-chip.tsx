"use client";

import { useTranslations } from "@cloud/i18n/client";
import { MODULE_META, moduleOf } from "../_lib/notice-meta";

/** 模块 chip：按 noticeType 前缀派生图标/色/标签。 */
export function ModuleChip({ type }: { type: string | null }) {
  const t = useTranslations("notifications");
  const meta = MODULE_META[moduleOf(type)];
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
