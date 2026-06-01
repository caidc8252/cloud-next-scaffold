// @vitest-environment jsdom
import * as React from "react"
import { render, screen, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { SidebarProvider, useSidebar, SIDEBAR_COOKIE } from "./sidebar"

vi.mock("next/navigation", () => ({ usePathname: () => "/" }))

function installMatchMedia(matches: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

function Probe() {
  const { collapsed, mobileOpen, toggle } = useSidebar()
  return (
    <div>
      <span data-testid="collapsed">{String(collapsed)}</span>
      <span data-testid="mobileOpen">{String(mobileOpen)}</span>
      <button onClick={toggle}>toggle</button>
    </div>
  )
}

describe("SidebarProvider / useSidebar", () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    document.cookie = `${SIDEBAR_COOKIE}=; max-age=0; path=/`
  })

  it("seeds collapsed from defaultCollapsed", () => {
    installMatchMedia(false)
    render(
      <SidebarProvider defaultCollapsed>
        <Probe />
      </SidebarProvider>,
    )
    expect(screen.getByTestId("collapsed").textContent).toBe("true")
  })

  it("desktop toggle flips collapsed and writes the cookie", () => {
    installMatchMedia(false)
    render(
      <SidebarProvider>
        <Probe />
      </SidebarProvider>,
    )
    expect(screen.getByTestId("collapsed").textContent).toBe("false")
    act(() => screen.getByText("toggle").click())
    expect(screen.getByTestId("collapsed").textContent).toBe("true")
    expect(document.cookie).toContain(`${SIDEBAR_COOKIE}=1`)
  })

  it("mobile toggle flips mobileOpen, not collapsed", () => {
    installMatchMedia(true)
    render(
      <SidebarProvider>
        <Probe />
      </SidebarProvider>,
    )
    act(() => screen.getByText("toggle").click())
    expect(screen.getByTestId("mobileOpen").textContent).toBe("true")
    expect(screen.getByTestId("collapsed").textContent).toBe("false")
  })

  it("useSidebar returns a no-op fallback outside a provider", () => {
    render(<Probe />)
    expect(screen.getByTestId("collapsed").textContent).toBe("false")
    act(() => screen.getByText("toggle").click()) // must not throw
  })
})
