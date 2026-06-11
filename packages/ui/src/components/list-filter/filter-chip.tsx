"use client"

import { XIcon } from "lucide-react"
import { useTranslations } from "@cloud/i18n/client"

import { Button } from "../ui"

// Applied-filter chip (portal-page-style-spec §4). Style-only + single remove;
// aria label comes from ui.listFilter.removeFilter, callers pass label + onRemove.
export function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const t = useTranslations("ui.listFilter")
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary-500/25 bg-primary-50 py-0.5 pr-1 pl-2.5 text-xs font-medium text-primary-700">
      {label}
      <Button variant="ghost" size="icon-xs" onClick={onRemove} aria-label={t("removeFilter")}>
        <XIcon className="size-3" />
      </Button>
    </span>
  )
}
