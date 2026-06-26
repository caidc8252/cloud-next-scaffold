// @vitest-environment jsdom
import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

import { Textarea } from "./textarea"

describe("Textarea", () => {
  it("neutralizes the browser autofill background", () => {
    // 回归：base Textarea 也要带 autofill 修复（共享 _field.ts 的 autofillFix），
    // 这样地址类多行字段被 Chrome 自动填充时不会被刷上淡蓝底。
    render(<Textarea placeholder="q" />)
    expect(screen.getByPlaceholderText("q").className).toContain(
      "autofill:[transition:background-color_9999s]"
    )
  })

  it("shows a character counter when showCount + maxLength are set", () => {
    render(<Textarea showCount maxLength={100} defaultValue="abc" placeholder="q" />)
    expect(screen.getByText("3 / 100")).toBeTruthy()
  })
})
