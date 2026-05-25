// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { useDateFormat } from "../src/components/ui/_date-shared";

function wrap(locale: "en" | "zh-CN" | "ja") {
  return ({ children }: { children: React.ReactNode }) => (
    <NextIntlClientProvider locale={locale} messages={{}}>
      {children}
    </NextIntlClientProvider>
  );
}

describe("useDateFormat", () => {
  it("returns English default for 'en'", () => {
    const { result } = renderHook(() => useDateFormat("date"), { wrapper: wrap("en") });
    expect(result.current.formatStr).toBe("MMM d, yyyy");
    expect(result.current.dateFnsLocale.code).toBe("en-US");
  });

  it("returns zh-CN default for 'zh-CN'", () => {
    const { result } = renderHook(() => useDateFormat("date"), { wrapper: wrap("zh-CN") });
    expect(result.current.formatStr).toBe("yyyy年M月d日");
    expect(result.current.dateFnsLocale.code).toBe("zh-CN");
  });

  it("returns ja default for 'ja'", () => {
    const { result } = renderHook(() => useDateFormat("date"), { wrapper: wrap("ja") });
    expect(result.current.formatStr).toBe("yyyy年M月d日");
    expect(result.current.dateFnsLocale.code).toBe("ja");
  });

  it("returns dateTime format when kind='dateTime'", () => {
    const { result } = renderHook(() => useDateFormat("dateTime"), { wrapper: wrap("en") });
    expect(result.current.formatStr).toBe("MMM d, yyyy HH:mm");
  });

  it("override formatStr wins over locale default", () => {
    const { result } = renderHook(() => useDateFormat("date", "yyyy-MM-dd"), { wrapper: wrap("zh-CN") });
    expect(result.current.formatStr).toBe("yyyy-MM-dd");
  });
});
