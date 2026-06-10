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

  it("with a prefix, the invalid ring is drawn only by the outer wrapper", () => {
    // 回归：prefix + invalid 时，外层容器画一圈错误 ring，内层 input 必须把自己的
    // aria-invalid ring/border 清掉，避免两层同心红 ring（见 input.tsx 注释）。
    const { container } = render(<Input prefix={<span>@</span>} invalid placeholder="q" />)
    const inner = screen.getByPlaceholderText("q")
    const wrapper = container.querySelector("div.flex.items-center") as HTMLElement

    // 外层容器承担错误态
    expect(wrapper.className).toContain("ring-2")
    expect(wrapper.className).toContain("border-error-strong")

    // 内层 input 仍标记 aria-invalid（a11y），但视觉 ring/border 被清掉。
    // 关键：twMerge 必须把基础串里的 aria-invalid:ring-2 真正剔除——否则两条同 group
    // 同时存在时，编译 CSS 里 ring-2 在后、按源码序胜出，第二圈 ring 仍会出现。
    expect(inner.getAttribute("aria-invalid")).toBe("true")
    expect(inner.className).toContain("aria-invalid:ring-0")
    expect(inner.className).toContain("aria-invalid:border-0")
    expect(inner.className).not.toContain("aria-invalid:ring-2")
  })
})
