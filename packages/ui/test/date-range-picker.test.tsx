// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import {
  DateRangePicker,
  DEFAULT_RANGE_PRESETS,
} from "../src/components/ui/date-range-picker";

const messages = {
  ui: {
    datePicker: {
      placeholder: { date: "Pick a date", range: "Pick a range", dateTime: "Pick a date and time" },
      presets: {
        today: "Today",
        last7: "Last 7 days",
        last30: "Last 30 days",
        thisMonth: "This month",
        lastMonth: "Last month",
      },
      clear: "Clear",
      ok: "OK",
    },
  },
};

function wrap(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("<DateRangePicker>", () => {
  it("renders placeholder when value is null", () => {
    wrap(<DateRangePicker placeholder="Pick a range" />);
    expect(screen.getByText("Pick a range")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pick a range" })).toBeTruthy();
  });

  it("renders 'from – to' formatted text when value is set", () => {
    wrap(
      <DateRangePicker
        value={{ from: new Date(2026, 4, 10), to: new Date(2026, 4, 17) }}
      />,
    );
    expect(screen.getByText("May 10, 2026 – May 17, 2026")).toBeTruthy();
  });

  it("DEFAULT_RANGE_PRESETS contains the five expected keys in order", () => {
    const keys = DEFAULT_RANGE_PRESETS.map((p) => p.key);
    expect(keys).toEqual(["today", "last7", "last30", "thisMonth", "lastMonth"]);
  });

  it("last7 preset covers exactly 7 days inclusive of today", () => {
    const ref = new Date(2026, 4, 20, 10, 30);
    const last7 = DEFAULT_RANGE_PRESETS.find((p) => p.key === "last7")!;
    const { from, to } = last7.getValue(ref);
    expect(from.getDate()).toBe(14);
    expect(from.getHours()).toBe(0);
    expect(to.getDate()).toBe(20);
    expect(to.getHours()).toBe(23);
  });

  it("today preset returns startOfDay → endOfDay", () => {
    const ref = new Date(2026, 4, 20, 10, 30);
    const today = DEFAULT_RANGE_PRESETS.find((p) => p.key === "today")!;
    const { from, to } = today.getValue(ref);
    expect(from.getDate()).toBe(20);
    expect(from.getHours()).toBe(0);
    expect(to.getDate()).toBe(20);
    expect(to.getHours()).toBe(23);
  });
});
