"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { useIsMobile } from "./use-is-mobile"
import { SIDEBAR_COOKIE } from "./sidebar-cookie"

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

interface SidebarContextValue {
  collapsed: boolean
  isMobile: boolean
  mobileOpen: boolean
  setCollapsed: (value: boolean) => void
  setMobileOpen: (value: boolean) => void
  toggle: () => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

// No-op fallback so consumers don't crash when used outside a provider
// (mirrors useTheme()).
function useSidebar(): SidebarContextValue {
  const ctx = React.useContext(SidebarContext)
  if (!ctx) {
    return {
      collapsed: false,
      isMobile: false,
      mobileOpen: false,
      setCollapsed: () => {},
      setMobileOpen: () => {},
      toggle: () => {},
    }
  }
  return ctx
}

function writeCollapsedCookie(collapsed: boolean) {
  if (typeof document === "undefined") return
  document.cookie = `${SIDEBAR_COOKIE}=${collapsed ? "1" : "0"}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`
}

function SidebarProvider({
  children,
  defaultCollapsed = false,
}: {
  children: React.ReactNode
  defaultCollapsed?: boolean
}) {
  const [collapsed, setCollapsedState] = React.useState(defaultCollapsed)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const isMobile = useIsMobile()
  const pathname = usePathname()

  const setCollapsed = React.useCallback((value: boolean) => {
    setCollapsedState(value)
    writeCollapsedCookie(value)
  }, [])

  const toggle = React.useCallback(() => {
    if (isMobile) {
      setMobileOpen((open) => !open)
      return
    }
    setCollapsedState((current) => {
      const next = !current
      writeCollapsedCookie(next)
      return next
    })
  }, [isMobile])

  // Close the mobile drawer whenever the route changes. Setting state during
  // render (guarded by the previous pathname) is React's recommended pattern
  // for "reset state when a value changes" — it avoids the cascading-render
  // lint rule and the extra commit an effect would incur.
  const [prevPathname, setPrevPathname] = React.useState(pathname)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setMobileOpen(false)
  }

  // "[" toggles the sidebar — but never while typing in a field.
  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) return
      if (event.key === "[" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        toggle()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [toggle])

  const value = React.useMemo<SidebarContextValue>(
    () => ({ collapsed, isMobile, mobileOpen, setCollapsed, setMobileOpen, toggle }),
    [collapsed, isMobile, mobileOpen, setCollapsed, toggle],
  )

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

export { SidebarProvider, useSidebar, type SidebarContextValue }
export { SIDEBAR_COOKIE } from "./sidebar-cookie"
