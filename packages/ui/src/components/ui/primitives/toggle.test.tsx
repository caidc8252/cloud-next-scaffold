// @vitest-environment jsdom
import { describe, expect, it } from "vitest"

import { toggleVariants } from "./toggle"

describe("toggleVariants — sizing", () => {
  it("keeps md as the fixed-height default control size", () => {
    const classes = toggleVariants()
    expect(classes).toContain("h-control-md")
    expect(classes).toContain("text-md")
  })

  it("supports content-driven auto size without fixed h-control utilities", () => {
    const classes = toggleVariants({ size: "auto" })
    expect(classes).toContain("px-cx-md")
    expect(classes).toContain("py-2")
    expect(classes).toContain("text-md")
    expect(classes).not.toContain("h-control-sm")
    expect(classes).not.toContain("h-control-md")
  })
})
