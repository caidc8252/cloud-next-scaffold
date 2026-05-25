// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { DateTimePicker } from "../src/components/ui/date-time-picker";

const messages = {
  ui: {
    datePicker: {
      placeholder: { date: "Pick a date", range: "Pick a range", dateTime: "Pick a date and time" },
      presets: { today: "Today", last7: "Last 7 days", last30: "Last 30 days", thisMonth: "This month", lastMonth: "Last month" },
      clear: "Clear",
      ok: "OK",
    },
  },
};

function wrap(ui: React.ReactNode, locale: "en" | "zh-CN" | "ja" = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("<DateTimePicker>", () => {
  it("renders placeholder when no value", () => {
    wrap(<DateTimePicker placeholder="Pick a date and time" />);
    expect(screen.getByText("Pick a date and time")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pick a date and time" })).toBeTruthy();
  });

  it("renders 'date HH:mm' formatted in en locale", () => {
    wrap(<DateTimePicker value={new Date(2026, 4, 10, 14, 30)} />);
    expect(screen.getByText("May 10, 2026 14:30")).toBeTruthy();
  });

  it("renders 'yyyy年M月d日 HH:mm' in zh-CN locale", () => {
    wrap(<DateTimePicker value={new Date(2026, 4, 10, 9, 5)} />, "zh-CN");
    expect(screen.getByText("2026年5月10日 09:05")).toBeTruthy();
  });

  it("name attribute emits ISO string in hidden input", () => {
    const value = new Date(Date.UTC(2026, 4, 10, 14, 30));
    wrap(<DateTimePicker value={value} name="meetingAt" />);
    const hidden = document.querySelector('input[type="hidden"][name="meetingAt"]') as HTMLInputElement;
    expect(hidden).toBeTruthy();
    expect(hidden.value).toBe(value.toISOString());
  });

  it("hidden input is empty when value is null", () => {
    wrap(<DateTimePicker value={null} name="meetingAt" />);
    const hidden = document.querySelector('input[type="hidden"][name="meetingAt"]') as HTMLInputElement;
    expect(hidden.value).toBe("");
  });

  it("renders a clear button when value is set and not required", () => {
    wrap(<DateTimePicker value={new Date(2026, 4, 10, 14, 30)} />);
    expect(screen.getByRole("button", { name: "Clear" })).toBeTruthy();
  });

  it("does not render a clear button when required", () => {
    wrap(<DateTimePicker value={new Date(2026, 4, 10, 14, 30)} required />);
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
  });
});
