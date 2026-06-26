// @vitest-environment jsdom
import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

import { StepIndicator } from "./step-indicator"

const STEPS = [
  { caption: "Step 1", label: "Company" },
  { caption: "Step 2", label: "Contracts" },
  { caption: "Done", label: "Confirmation" },
]

describe("StepIndicator", () => {
  it("renders every step label and caption", () => {
    render(<StepIndicator steps={STEPS} current={1} />)
    for (const step of STEPS) {
      expect(screen.getByText(step.label)).toBeTruthy()
      expect(screen.getByText(step.caption)).toBeTruthy()
    }
  })

  it("marks only the current step with aria-current", () => {
    render(<StepIndicator steps={STEPS} current={1} />)
    const current = screen.getByText("Contracts").closest("li")
    expect(current?.getAttribute("aria-current")).toBe("step")
    expect(screen.getByText("Company").closest("li")?.getAttribute("aria-current")).toBeNull()
    expect(screen.getByText("Confirmation").closest("li")?.getAttribute("aria-current")).toBeNull()
  })

  it("flags states via data-state: earlier completed, later upcoming", () => {
    render(<StepIndicator steps={STEPS} current={1} />)
    expect(screen.getByText("Company").closest("li")?.getAttribute("data-state")).toBe("completed")
    expect(screen.getByText("Contracts").closest("li")?.getAttribute("data-state")).toBe("active")
    expect(screen.getByText("Confirmation").closest("li")?.getAttribute("data-state")).toBe(
      "upcoming",
    )
  })

  it("shows a check icon for completed steps and the number otherwise", () => {
    render(<StepIndicator steps={STEPS} current={1} />)
    // The dot is the first span inside each <li>.
    const dot = (label: string) => screen.getByText(label).closest("li")?.querySelector("span")
    // index 0 completed -> check icon (svg), no digit text
    expect(dot("Company")?.querySelector("svg")).toBeTruthy()
    expect(dot("Company")?.textContent).toBe("")
    // active + upcoming -> show their 1-based number
    expect(dot("Contracts")?.textContent).toBe("2")
    expect(dot("Confirmation")?.textContent).toBe("3")
  })
})
