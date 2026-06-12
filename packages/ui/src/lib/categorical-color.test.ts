import { describe, expect, it } from "vitest"

import {
  CATEGORICAL_COLOR_COUNT,
  categoricalColorIndex,
} from "./categorical-color"

describe("categoricalColorIndex", () => {
  it("is deterministic — same seed yields the same bucket", () => {
    expect(categoricalColorIndex("N950")).toBe(categoricalColorIndex("N950"))
    expect(categoricalColorIndex("X900 Pro")).toBe(categoricalColorIndex("X900 Pro"))
  })

  it("always lands in [0, CATEGORICAL_COLOR_COUNT)", () => {
    for (const seed of ["S90", "X900", "N950", "com.acme.pos", "", "用户名"]) {
      const index = categoricalColorIndex(seed)
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(CATEGORICAL_COLOR_COUNT)
      expect(Number.isInteger(index)).toBe(true)
    }
  })

  it("spreads varied seeds across multiple buckets", () => {
    const seeds = Array.from({ length: 40 }, (_, i) => `model-${i}`)
    const buckets = new Set(seeds.map((s) => categoricalColorIndex(s)))
    // Not asserting a perfect distribution, just that it isn't degenerate.
    expect(buckets.size).toBeGreaterThan(3)
  })
})
