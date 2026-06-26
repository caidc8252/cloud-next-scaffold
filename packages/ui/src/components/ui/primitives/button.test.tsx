// @vitest-environment jsdom
import { describe, it, expect } from "vitest"

import { buttonVariants } from "./button"

describe("buttonVariants — danger hover/active (TOMS v2.0)", () => {
  // v2.0 deprecated the v1 brightness() hover in favor of solid color steps
  // (hover → error-700, active → error-700 mixed toward text). Guard both
  // the new classes and the absence of the old filter approach.
  for (const variant of ["danger"] as const) {
    it(`${variant}: uses solid error steps, not brightness filters`, () => {
      const classes = buttonVariants({ variant })
      expect(classes).toContain("hover:bg-error-strong")
      expect(classes).toContain("active:bg-error-active")
      expect(classes).not.toContain("brightness")
    })
  }
})

describe("buttonVariants — TOMS component scale", () => {
  it("default button uses the 36px / 14px / 600 control scale", () => {
    const classes = buttonVariants()
    expect(classes).toContain("h-control-md")
    expect(classes).toContain("text-md")
    expect(classes).toContain("font-semibold")
    expect(classes).not.toContain("translate-y-px")
  })

  it("small button keeps the 28px height without shrinking text below the control scale", () => {
    const classes = buttonVariants({ size: "sm" })
    expect(classes).toContain("h-control-sm")
    expect(classes).not.toContain("text-xs")
  })
})
