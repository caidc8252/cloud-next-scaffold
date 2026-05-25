// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { DatePicker } from "../src/components/ui/date-picker";

const messages = {
  ui: {
    datePicker: {
      placeholder: {
        date: "Pick a date",
        range: "Pick a range",
        dateTime: "Pick a date and time",
      },
      clear: "Clear",
      ok: "OK",
      presets: {
        today: "Today",
        last7: "Last 7 days",
        last30: "Last 30 days",
        thisMonth: "This month",
        lastMonth: "Last month",
      },
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

describe("<DatePicker>", () => {
  it("renders the placeholder when no value", () => {
    wrap(<DatePicker placeholder="Pick a date" />);
    expect(screen.getByText("Pick a date")).toBeTruthy();
    // Trigger is a button, not an input
    expect(screen.getByRole("button", { name: "Pick a date" })).toBeTruthy();
  });

  it("renders value formatted by the en default when locale=en", () => {
    wrap(<DatePicker value={new Date(2026, 4, 10)} placeholder="Pick a date" />);
    expect(screen.getByText("May 10, 2026")).toBeTruthy();
  });

  it("renders value formatted by the zh-CN default when locale=zh-CN", () => {
    wrap(<DatePicker value={new Date(2026, 4, 10)} placeholder="选择日期" />, "zh-CN");
    expect(screen.getByText("2026年5月10日")).toBeTruthy();
  });

  it("formatStr overrides the locale default", () => {
    wrap(<DatePicker value={new Date(2026, 4, 10)} formatStr="yyyy-MM-dd" />);
    expect(screen.getByText("2026-05-10")).toBeTruthy();
  });

  it("emits ISO date in hidden input when name is set", () => {
    wrap(<DatePicker value={new Date(2026, 4, 10)} name="dueDate" />);
    const hidden = document.querySelector('input[type="hidden"][name="dueDate"]') as HTMLInputElement;
    expect(hidden).toBeTruthy();
    expect(hidden.value).toBe("2026-05-10");
  });

  it("hidden input is empty when value is null", () => {
    wrap(<DatePicker value={null} name="dueDate" />);
    const hidden = document.querySelector('input[type="hidden"][name="dueDate"]') as HTMLInputElement;
    expect(hidden.value).toBe("");
  });

  it("renders a clear button when value is set and not required", () => {
    wrap(<DatePicker value={new Date(2026, 4, 10)} />);
    expect(screen.getByRole("button", { name: "Clear" })).toBeTruthy();
  });

  it("does not render a clear button when required", () => {
    wrap(<DatePicker value={new Date(2026, 4, 10)} required />);
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
  });
});
