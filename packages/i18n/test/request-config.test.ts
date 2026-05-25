import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = {
  get: vi.fn<(name: string) => { value: string } | undefined>(),
};

vi.mock("next/headers", () => ({
  cookies: async () => cookieStore,
}));

// next-intl/server's getRequestConfig is a thin wrapper that returns the user fn.
// In tests we replace it with identity to inspect the returned config directly.
vi.mock("next-intl/server", () => ({
  getRequestConfig: (fn: unknown) => fn,
}));

import { createI18nRequestConfig } from "../src/server.ts";

beforeEach(() => {
  cookieStore.get.mockReset();
});

const enMessages = {
  auth: { login: { title: "EN title", submit: "Sign in" } },
  common: { logout: "Sign out" },
};
const zhMessages = {
  auth: { login: { title: "中文标题" } },
};

const loadMessages = vi.fn(async (locale: string) => {
  if (locale === "en") return enMessages;
  if (locale === "zh-CN") return zhMessages;
  return {};
});

describe("createI18nRequestConfig", () => {
  it("returns en config when no locale cookie", async () => {
    cookieStore.get.mockReturnValue(undefined);
    const config = createI18nRequestConfig({ loadMessages });
    // Call the inner config function
    const result = await (config as unknown as () => Promise<{
      locale: string;
      timeZone: string;
      messages: typeof enMessages;
    }>)();
    expect(result.locale).toBe("en");
    expect(result.timeZone).toBe("UTC");
    expect(result.messages).toEqual(enMessages);
  });

  it("merges en as base when zh-CN is selected (cross-locale fallback)", async () => {
    cookieStore.get.mockImplementation((name) => {
      if (name === "locale") return { value: "zh-CN" };
      if (name === "tz") return { value: "Asia/Shanghai" };
      return undefined;
    });

    const config = createI18nRequestConfig({ loadMessages });
    const result = await (config as unknown as () => Promise<{
      locale: string;
      timeZone: string;
      messages: { auth: { login: { title: string; submit: string } }; common: { logout: string } };
    }>)();

    expect(result.locale).toBe("zh-CN");
    expect(result.timeZone).toBe("Asia/Shanghai");
    // Translated key kept
    expect(result.messages.auth.login.title).toBe("中文标题");
    // Missing key falls back to en
    expect(result.messages.auth.login.submit).toBe("Sign in");
    expect(result.messages.common.logout).toBe("Sign out");
  });
});
