// @vitest-environment jsdom
import * as React from "react"
import { render } from "@testing-library/react"
import { afterAll, beforeAll, describe, it, expect, vi } from "vitest"

import { InputOTP, InputOTPGroup, InputOTPSlot } from "./input-otp"

// input-otp 内部用到 ResizeObserver；jsdom 没有，stub 成 no-op（同 virtual-table.test）。
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
beforeAll(() => {
  vi.stubGlobal("ResizeObserver", NoopObserver)
})
afterAll(() => {
  vi.unstubAllGlobals()
})

describe("InputOTP — invalid state has a single owner", () => {
  it("the group draws the unified invalid ring; slots do not add their own border", () => {
    // 回归：标了 aria-invalid 的 slot 在 group 内时，只允许 group 的 :has() 画一圈 ring；
    // slot 不再自带 aria-invalid 边框，否则 group 一圈 + 命中 slot 各一道 = 重复校验样式。
    // slots[index] 依赖 OTPInput 提供的 context，所以必须包在 <InputOTP> 里渲染。
    const { container } = render(
      <InputOTP maxLength={2}>
        <InputOTPGroup>
          <InputOTPSlot index={0} aria-invalid />
          <InputOTPSlot index={1} />
        </InputOTPGroup>
      </InputOTP>,
    )
    const group = container.querySelector('[data-slot="input-otp-group"]') as HTMLElement
    const slots = container.querySelectorAll('[data-slot="input-otp-slot"]')

    // group 是错误态的单一所有者
    expect(group.className).toContain("has-aria-invalid:ring-2")
    expect(group.className).toContain("has-aria-invalid:border-destructive")

    // slot 不再自描 aria-invalid 边框（避免与 group ring 重复）
    slots.forEach((slot) => {
      expect(slot.className).not.toContain("aria-invalid:border-error-strong")
    })
  })
})
