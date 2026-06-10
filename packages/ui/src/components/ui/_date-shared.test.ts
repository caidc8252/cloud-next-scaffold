// @vitest-environment jsdom
import { describe, it, expect } from "vitest"

import { dateTriggerClass } from "./_date-shared"

describe("dateTriggerClass — invalid state", () => {
  it("carries the aria-invalid error border + ring, on a single (trigger) layer", () => {
    // 各 date picker 由 invalid prop 把 aria-invalid 透传到触发器按钮，这组变体随属性生效。
    // 触发器外层只有无边框定位 div，单层 ring——不会出现 Input prefix 那种双层。
    const cls = dateTriggerClass("md", false)
    expect(cls).toContain("aria-invalid:border-error-strong")
    expect(cls).toContain("aria-invalid:ring-2")
    expect(cls).toContain("aria-invalid:ring-error/20")
  })

  it("error classes are independent of size / showClear", () => {
    for (const size of ["sm", "md", "lg"] as const) {
      for (const showClear of [true, false]) {
        expect(dateTriggerClass(size, showClear)).toContain("aria-invalid:ring-2")
      }
    }
  })
})
