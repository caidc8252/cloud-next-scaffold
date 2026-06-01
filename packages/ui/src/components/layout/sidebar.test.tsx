// @vitest-environment jsdom
import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { Sidebar, type SidebarSection } from "./sidebar"
import { SidebarProvider } from "../../lib/sidebar"

vi.mock("next/navigation", () => ({ usePathname: () => "/customers" }))
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

function installMatchMedia(matches: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches, media: query, addEventListener: () => {}, removeEventListener: () => {},
  }))
}

const sections: SidebarSection[] = [
  {
    label: "Manage",
    items: [
      { href: "/customers", icon: <svg data-testid="ic-customers" />, label: "Customers" },
      {
        icon: <svg data-testid="ic-devices" />,
        label: "Devices",
        children: [{ href: "/devices/list", label: "Fleet" }],
      },
    ],
  },
]

describe("Sidebar rail mode", () => {
  beforeEach(() => vi.unstubAllGlobals())

  it("shows section labels and item labels when expanded", () => {
    installMatchMedia(false)
    render(
      <SidebarProvider>
        <Sidebar sections={sections} />
      </SidebarProvider>,
    )
    expect(screen.getByText("Manage")).toBeTruthy()
    expect(screen.getByText("Customers")).toBeTruthy()
  })

  it("hides the section label and shows aria-labelled icon triggers when collapsed", () => {
    installMatchMedia(false) // desktop → rail = collapsed && !isMobile
    render(
      <SidebarProvider defaultCollapsed>
        <Sidebar sections={sections} />
      </SidebarProvider>,
    )
    expect(screen.queryByText("Manage")).toBeNull()
    // Leaf item is reachable by its aria-label rather than visible text.
    expect(screen.getByLabelText("Customers")).toBeTruthy()
    expect(screen.getByLabelText("Devices")).toBeTruthy()
  })
})
