"use client"

import { ChevronDownIcon, FunnelIcon } from "lucide-react"
import { useTranslations } from "@cloud/i18n/client"

import { Badge, Button } from "../ui"

// Advanced trigger, three states (portal-page-style-spec §4.1): rest / count Badge /
// open (primary-tinted + chevron flipped). count is computed by the caller (which
// fields count as "advanced" is the page's call); the badge shows only when > 0.
export function AdvancedFilterButton({
  open,
  onToggle,
  count,
}: {
  open: boolean
  onToggle: () => void
  count: number
}) {
  const t = useTranslations("ui.listFilter")
  return (
    <Button
      variant="secondary"
      size="md"
      aria-expanded={open}
      onClick={onToggle}
      iconLeft={<FunnelIcon className="size-4" />}
      iconRight={
        <ChevronDownIcon
          className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      }
      className={open ? "border-primary-500 bg-primary-50 text-primary-700" : undefined}
    >
      {t("advanced")}
      {count > 0 && <Badge tone="info" className="ml-1">{count}</Badge>}
    </Button>
  )
}
