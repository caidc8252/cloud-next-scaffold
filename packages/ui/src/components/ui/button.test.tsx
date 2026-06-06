// @vitest-environment jsdom
import { describe, it, expect } from "vitest"

import { buttonVariants } from "./button"

describe("buttonVariants — danger hover/active (TOMS v2.0)", () => {
  // v2.0 deprecated the v1 brightness() hover in favor of solid color steps
  // (hover → error-700, active → error-700 mixed toward text). Guard both
  // the new classes and the absence of the old filter approach.
  for (const variant of ["destructive", "danger"] as const) {
    it(`${variant}: uses solid error steps, not brightness filters`, () => {
      const classes = buttonVariants({ variant })
      expect(classes).toContain("hover:bg-error-strong")
      expect(classes).toContain("active:bg-error-active")
      expect(classes).not.toContain("brightness")
    })
  }
})

describe("buttonVariants — soft family (TOMS v2.0)", () => {
  it("soft: tonal primary fill", () => {
    const classes = buttonVariants({ variant: "soft" })
    expect(classes).toContain("bg-primary-50")
    expect(classes).toContain("text-primary-700")
  })

  it("subtle: transparent until hover", () => {
    const classes = buttonVariants({ variant: "subtle" })
    expect(classes).toContain("text-content-secondary")
    expect(classes).toContain("hover:bg-surface-hover")
    expect(classes).not.toContain("bg-primary")
  })

  for (const [variant, bg, fg] of [
    ["soft-success", "bg-success-bg", "text-success-strong"],
    ["soft-warning", "bg-warning-bg", "text-warning-strong"],
    ["soft-danger", "bg-error-bg", "text-error-strong"],
    ["soft-info", "bg-info-bg", "text-info-strong"],
  ] as const) {
    it(`${variant}: tone-bg fill with strong tone text`, () => {
      const classes = buttonVariants({ variant })
      expect(classes).toContain(bg)
      expect(classes).toContain(fg)
    })
  }
})
