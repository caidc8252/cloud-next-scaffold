"use client"

import type { ReactNode } from "react"
import { FunnelIcon, RotateCcwIcon, SearchIcon, XIcon } from "lucide-react"
import { useTranslations } from "@cloud/i18n/client"

import {
  Button,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../ui"

// Right-side advanced-filter Sheet shell (portal-page-style-spec §4.1): funnel header
// (title / description in one vertically-centered column, close inside the flex row —
// not the primitive's absolute close), scrollable body (Group / Field), footer
// (Reset left + Apply & Search right). Fields + deferred-apply wiring come from the
// caller via children + callbacks.
export function AdvancedFilterSheet({
  open,
  onOpenChange,
  onApply,
  onReset,
  resetDisabled,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: () => void
  onReset: () => void
  resetDisabled?: boolean
  children: ReactNode
}) {
  const t = useTranslations("ui.listFilter")
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* Override the default w-[60%]: full width on mobile, capped near 560px on desktop. */}
      <SheetContent
        side="right"
        showCloseButton={false}
        className="data-[side=right]:w-full sm:max-w-xl"
      >
        <SheetHeader className="flex-row items-center gap-2.5 border-b border-line-subtle">
          <FunnelIcon className="size-4 shrink-0 text-primary-700" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <SheetTitle>{t("advancedTitle")}</SheetTitle>
            <SheetDescription className="text-xs text-content-tertiary">
              {t("advancedHint")}
            </SheetDescription>
          </div>
          <SheetClose render={<Button variant="ghost" size="icon-sm" aria-label={t("close")} />}>
            <XIcon className="size-4" />
          </SheetClose>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-5">{children}</div>

        <SheetFooter className="flex-row justify-end items-center gap-2 border-t border-line-subtle">
          <Button
            variant="ghost"
            size="md"
            iconLeft={<RotateCcwIcon className="size-4" />}
            onClick={onReset}
            disabled={resetDisabled}
          >
            {t("reset")}
          </Button>
          <Button
            variant="primary"
            size="md"
            iconLeft={<SearchIcon className="size-4" />}
            onClick={onApply}
          >
            {t("applySearch")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// A group of fields inside the sheet body: overline heading + 2-column grid (§4.1).
export function AdvancedFilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-2xs font-semibold tracking-wide text-content-tertiary uppercase">
        {label}
      </h3>
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">{children}</div>
    </section>
  )
}

// A single field cell: lowercase label + control (Select / Input / ToggleGroup…).
// Pass className="sm:col-span-2" to span both columns.
export function AdvancedFilterField({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label className="text-2xs font-medium tracking-wide text-content-tertiary uppercase">
        {label}
      </label>
      {children}
    </div>
  )
}
