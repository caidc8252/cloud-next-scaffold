import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = {
  set: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: async () => cookieStore,
}));

import { setLocaleAction, setTimeZoneAction } from "../src/actions.ts";

beforeEach(() => {
  cookieStore.set.mockReset();
});

describe("setLocaleAction", () => {
  it("writes cookie for valid locales", async () => {
    await setLocaleAction("zh-CN");
    expect(cookieStore.set).toHaveBeenCalledWith(
      "locale",
      "zh-CN",
      expect.objectContaining({ path: "/", sameSite: "lax" }),
    );
  });

  it("ignores unknown locales", async () => {
    await setLocaleAction("fr");
    expect(cookieStore.set).not.toHaveBeenCalled();
  });
});

describe("setTimeZoneAction", () => {
  it("writes cookie for valid IANA zones", async () => {
    await setTimeZoneAction("Asia/Tokyo");
    expect(cookieStore.set).toHaveBeenCalledWith(
      "tz",
      "Asia/Tokyo",
      expect.objectContaining({ path: "/", sameSite: "lax" }),
    );
  });

  it("ignores invalid zones", async () => {
    await setTimeZoneAction("Not/AZone");
    expect(cookieStore.set).not.toHaveBeenCalled();
  });
});
