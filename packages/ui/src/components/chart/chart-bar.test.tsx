import { describe, expect, it } from "vitest"

import { getStackedBarRadius } from "./chart-bar"

const KEYS = ["card", "wallet", "bank"]

describe("getStackedBarRadius (vertical stack)", () => {
  const datum = { card: 10, wallet: 20, bank: 30 }

  it("rounds only the free (top) end of the last visible series", () => {
    expect(getStackedBarRadius("bank", datum, { keys: KEYS })).toEqual([4, 4, 0, 0])
  })

  it("leaves the axis-adjacent bottom series flat", () => {
    expect(getStackedBarRadius("card", datum, { keys: KEYS })).toEqual([0, 0, 0, 0])
  })

  it("leaves middle segments flat", () => {
    expect(getStackedBarRadius("wallet", datum, { keys: KEYS })).toEqual([0, 0, 0, 0])
  })

  it("honours a custom radius", () => {
    expect(getStackedBarRadius("bank", datum, { keys: KEYS, radius: 8 })).toEqual([8, 8, 0, 0])
  })

  it("rounds a single non-stacked series (it is its own top)", () => {
    expect(getStackedBarRadius("card", { card: 10 }, { keys: ["card"] })).toEqual([4, 4, 0, 0])
  })
})

describe("getStackedBarRadius (zero-aware)", () => {
  it("treats a zero top segment as absent, promoting the next series to the top", () => {
    const datum = { card: 10, wallet: 20, bank: 0 }
    expect(getStackedBarRadius("wallet", datum, { keys: KEYS })).toEqual([4, 4, 0, 0])
    expect(getStackedBarRadius("bank", datum, { keys: KEYS })).toEqual([0, 0, 0, 0])
  })

  it("treats negative values as absent (diverging stacks out of scope)", () => {
    const datum = { card: 10, wallet: 20, bank: -5 }
    expect(getStackedBarRadius("bank", datum, { keys: KEYS })).toEqual([0, 0, 0, 0])
    expect(getStackedBarRadius("wallet", datum, { keys: KEYS })).toEqual([4, 4, 0, 0])
  })
})

describe("getStackedBarRadius (hidden-aware)", () => {
  it("skips hidden series when picking the visible top", () => {
    const datum = { card: 10, wallet: 20, bank: 30 }
    const options = { keys: KEYS, hiddenKeys: ["bank"] }
    expect(getStackedBarRadius("wallet", datum, options)).toEqual([4, 4, 0, 0])
    expect(getStackedBarRadius("bank", datum, options)).toEqual([0, 0, 0, 0])
  })
})

describe("getStackedBarRadius (horizontal stack)", () => {
  const datum = { card: 10, wallet: 20, bank: 30 }
  const options = { keys: KEYS, orientation: "horizontal" as const }

  it("rounds only the free (right) end of the last visible series", () => {
    expect(getStackedBarRadius("bank", datum, options)).toEqual([0, 4, 4, 0])
  })

  it("leaves the axis-adjacent left series flat", () => {
    expect(getStackedBarRadius("card", datum, options)).toEqual([0, 0, 0, 0])
  })
})
