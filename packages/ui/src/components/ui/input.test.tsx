// @vitest-environment jsdom
import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

import { Input } from "./input"

describe("Input — TOMS v2.0 states", () => {
  it("uses the 36px / 14px control scale by default", () => {
    render(<Input placeholder="q" />)
    const el = screen.getByPlaceholderText("q")
    expect(el.className).toContain("h-control-md")
    expect(el.className).toContain("text-md")
  })

  it("filled variant uses the tonal surface", () => {
    render(<Input variant="filled" placeholder="q" />)
    expect(screen.getByPlaceholderText("q").className).toContain("bg-surface-3")
  })

  it("warn/ok validation set tone borders", () => {
    const { rerender } = render(<Input validation="warn" placeholder="q" />)
    expect(screen.getByPlaceholderText("q").className).toContain("border-warning-500")

    rerender(<Input validation="ok" placeholder="q" />)
    expect(screen.getByPlaceholderText("q").className).toContain("border-success-500")
  })

  it("invalid takes priority over validation", () => {
    render(<Input invalid validation="ok" placeholder="q" />)
    const el = screen.getByPlaceholderText("q")
    expect(el.getAttribute("aria-invalid")).toBe("true")
    expect(el.className).not.toContain("border-success-500")
  })

  it("readOnly inputs carry the read-only surface classes", () => {
    render(<Input readOnly placeholder="q" />)
    expect(screen.getByPlaceholderText("q").className).toContain("read-only:bg-surface-3")
  })
})
