"use client"

import { Children, type ReactNode } from "react"
import { useTranslations } from "@cloud/i18n/client"

import { Button } from "../ui"

// Applied-filter row (portal-page-style-spec §4): renders only when it has chips
// (returns null otherwise, so it never reserves vertical space). Children are
// usually `{cond ? <FilterChip/> : null}` — null / false are dropped by Children.toArray.
export function AppliedFilters({
  children,
  onClearAll,
}: {
  children: ReactNode
  onClearAll: () => void
}) {
  const t = useTranslations("ui.listFilter")
  const hasChips = Children.toArray(children).length > 0
  if (!hasChips) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-content-tertiary">{t("activeFilters")}</span>
      {children}
      <Button variant="ghost" size="xs" onClick={onClearAll}>
        {t("clearAll")}
      </Button>
    </div>
  )
}
