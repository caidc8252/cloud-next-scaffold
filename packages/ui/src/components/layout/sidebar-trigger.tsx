"use client"

import * as React from "react"
import { Menu, PanelLeft, PanelRight } from "lucide-react"
import { useSidebar } from "../../lib/sidebar"
import { cn } from "../../lib/utils"

// Toggles the sidebar: collapse/expand the rail on desktop, open/close the
// drawer on mobile. Drop it in the header's `leading` slot. Also reachable
// via the global "[" shortcut (handled by SidebarProvider).
export function SidebarTrigger({ className }: { className?: string }) {
  const { collapsed, isMobile, toggle } = useSidebar()
  const Icon = isMobile ? Menu : collapsed ? PanelRight : PanelLeft
  const label = isMobile
    ? "Open navigation"
    : collapsed
      ? "Expand sidebar"
      : "Collapse sidebar"

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={`${label}  [`}
      className={cn(
        "inline-grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-content-tertiary transition-colors hover:bg-surface-hover hover:text-content-primary",
        className,
      )}
    >
      <Icon size={16} />
    </button>
  )
}
