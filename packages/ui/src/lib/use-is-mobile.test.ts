// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useIsMobile } from "./use-is-mobile"

// jsdom has no matchMedia — install a controllable mock.
function installMatchMedia(initialMatches: boolean) {
  let matches = initialMatches
  const listeners = new Set<() => void>()
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches,
    media: query,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  }))
  return {
    set(next: boolean) {
      matches = next
      listeners.forEach((cb) => cb())
    },
  }
}

describe("useIsMobile", () => {
  beforeEach(() => vi.unstubAllGlobals())

  it("returns true when the viewport matches the mobile query", () => {
    installMatchMedia(true)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it("returns false on a wide viewport", () => {
    installMatchMedia(false)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it("updates when the media query changes", () => {
    const mq = installMatchMedia(false)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
    act(() => mq.set(true))
    expect(result.current).toBe(true)
  })
})
