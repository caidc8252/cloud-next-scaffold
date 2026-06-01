"use client"

import * as React from "react"

const MOBILE_QUERY = "(max-width: 767px)"

// True when the viewport is below the md breakpoint (<768px).
// SSR-safe: returns false on the first render, then corrects after mount.
// Use it for BEHAVIOR decisions only (what the trigger does) — drive
// responsive RENDERING with CSS (e.g. `hidden md:flex`) to avoid a flash.
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY)
    const onChange = () => setIsMobile(window.matchMedia(MOBILE_QUERY).matches)
    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
