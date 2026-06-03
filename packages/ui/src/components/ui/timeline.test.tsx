// @vitest-environment jsdom
import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

import {
  Timeline,
  TimelineActor,
  TimelineContent,
  TimelineDescription,
  TimelineHeader,
  TimelineItem,
  TimelineMarker,
  TimelineTime,
  TimelineTimeRow,
  TimelineTitle,
  type TimelineEntry,
} from "./timeline"

function FakeIcon() {
  return <svg data-testid="fake-icon" />
}

describe("Timeline (slots)", () => {
  it("renders slot content and emits mode data attributes on the root", () => {
    render(
      <Timeline density="compact" stacked data-testid="root">
        <TimelineItem>
          <TimelineMarker tone="success" />
          <TimelineContent>
            <TimelineHeader>
              <TimelineTitle>Firmware updated</TimelineTitle>
              <TimelineTimeRow>
                <TimelineTime dateTime="2026-06-03T14:22:08">2026-06-03 14:22:08</TimelineTime>
                <TimelineActor>ops-svc</TimelineActor>
              </TimelineTimeRow>
            </TimelineHeader>
            <TimelineDescription>Push completed.</TimelineDescription>
          </TimelineContent>
        </TimelineItem>
      </Timeline>,
    )
    const root = screen.getByTestId("root")
    expect(root.tagName).toBe("UL")
    expect(root.getAttribute("data-density")).toBe("compact")
    expect(root.getAttribute("data-stacked")).toBe("")
    expect(screen.getByText("Firmware updated")).toBeTruthy()
    expect(screen.getByText("Push completed.")).toBeTruthy()
    expect(screen.getByText("ops-svc")).toBeTruthy()
  })

  it("omits data attributes for the default mode", () => {
    render(
      <Timeline data-testid="root">
        <TimelineItem>
          <TimelineMarker />
          <TimelineContent>
            <TimelineHeader>
              <TimelineTitle>Provisioned</TimelineTitle>
            </TimelineHeader>
          </TimelineContent>
        </TimelineItem>
      </Timeline>,
    )
    const root = screen.getByTestId("root")
    expect(root.getAttribute("data-density")).toBe("default")
    expect(root.getAttribute("data-stacked")).toBeNull()
  })

  it("renders a ring-dot marker when no icon child is given", () => {
    const { container } = render(
      <Timeline>
        <TimelineItem>
          <TimelineMarker tone="warning" />
          <TimelineContent>
            <TimelineHeader>
              <TimelineTitle>Battery low</TimelineTitle>
            </TimelineHeader>
          </TimelineContent>
        </TimelineItem>
      </Timeline>,
    )
    const marker = container.querySelector('[data-slot="timeline-marker"]')
    expect(marker?.getAttribute("data-variant")).toBe("dot")
    expect(marker?.getAttribute("aria-hidden")).toBe("true")
    expect(marker?.className).toContain("text-warning")
  })

  it("renders an icon node marker when children are given", () => {
    const { container } = render(
      <Timeline>
        <TimelineItem>
          <TimelineMarker tone="error">
            <FakeIcon />
          </TimelineMarker>
          <TimelineContent>
            <TimelineHeader>
              <TimelineTitle>Sync failed</TimelineTitle>
            </TimelineHeader>
          </TimelineContent>
        </TimelineItem>
      </Timeline>,
    )
    const marker = container.querySelector('[data-slot="timeline-marker"]')
    expect(marker?.getAttribute("data-variant")).toBe("icon")
    expect(marker?.className).toContain("border-error")
    expect(screen.getByTestId("fake-icon")).toBeTruthy()
  })

  it("renders TimelineTime as a <time> element with dateTime", () => {
    render(
      <Timeline>
        <TimelineItem>
          <TimelineMarker />
          <TimelineContent>
            <TimelineHeader>
              <TimelineTitle>Provisioned</TimelineTitle>
              <TimelineTime dateTime="2025-09-04T11:22:00">2025-09-04 11:22:00</TimelineTime>
            </TimelineHeader>
          </TimelineContent>
        </TimelineItem>
      </Timeline>,
    )
    const time = screen.getByText("2025-09-04 11:22:00")
    expect(time.tagName).toBe("TIME")
    expect(time.getAttribute("datetime")).toBe("2025-09-04T11:22:00")
  })

  it("intersperses a separator between TimelineTimeRow children", () => {
    const { container } = render(
      <Timeline stacked>
        <TimelineItem>
          <TimelineMarker />
          <TimelineContent>
            <TimelineHeader>
              <TimelineTitle>Login</TimelineTitle>
              <TimelineTimeRow>
                <TimelineTime>14:22:08</TimelineTime>
                <TimelineActor>admin</TimelineActor>
              </TimelineTimeRow>
            </TimelineHeader>
          </TimelineContent>
        </TimelineItem>
      </Timeline>,
    )
    const row = container.querySelector('[data-slot="timeline-time-row"]')
    expect(row?.textContent).toBe("14:22:08·admin")
  })
})

describe("Timeline (items sugar)", () => {
  const ENTRIES: TimelineEntry[] = [
    {
      id: "fw",
      title: "Firmware updated · v3.5.0",
      time: "2026-06-03 14:22:08",
      dateTime: "2026-06-03T14:22:08",
      actor: "ops-svc",
      description: "Push completed, terminal rebooted.",
      tone: "success",
    },
    {
      id: "batt",
      title: "Battery low · 14%",
      time: "2026-06-03 11:04:32",
      tone: "warning",
      icon: <FakeIcon />,
    },
    { id: "prov", title: "Provisioned", time: "2025-09-04 11:22:00" },
  ]

  it("renders one item per entry with markers driven by icon/tone", () => {
    const { container } = render(<Timeline items={ENTRIES} />)
    expect(container.querySelectorAll("li").length).toBe(3)
    const markers = container.querySelectorAll('[data-slot="timeline-marker"]')
    expect(markers[0]?.getAttribute("data-variant")).toBe("dot")
    expect(markers[0]?.className).toContain("text-success")
    expect(markers[1]?.getAttribute("data-variant")).toBe("icon")
    expect(screen.getByTestId("fake-icon")).toBeTruthy()
  })

  it("places time in the header and actor after the description by default", () => {
    const { container } = render(<Timeline items={ENTRIES} />)
    expect(container.querySelector('[data-slot="timeline-time-row"]')).toBeNull()
    const firstItem = container.querySelector("li")
    const slots = Array.from(firstItem?.querySelectorAll("[data-slot]") ?? []).map((el) =>
      el.getAttribute("data-slot"),
    )
    const description = slots.indexOf("timeline-description")
    const actor = slots.indexOf("timeline-actor")
    expect(description).toBeGreaterThan(-1)
    expect(actor).toBeGreaterThan(description)
  })

  it("moves time and actor into a time-row in stacked mode", () => {
    const { container } = render(<Timeline items={ENTRIES} stacked />)
    const row = container.querySelector('[data-slot="timeline-time-row"]')
    expect(row?.textContent).toBe("2026-06-03 14:22:08·ops-svc")
  })

  it("skips optional fields that are not provided", () => {
    const { container } = render(<Timeline items={[{ title: "Sync OK" }]} />)
    expect(screen.getByText("Sync OK")).toBeTruthy()
    expect(container.querySelector('[data-slot="timeline-description"]')).toBeNull()
    expect(container.querySelector('[data-slot="timeline-actor"]')).toBeNull()
    expect(container.querySelector("time")).toBeNull()
  })
})
