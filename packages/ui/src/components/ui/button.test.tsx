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
