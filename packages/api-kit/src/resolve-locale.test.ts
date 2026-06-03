import { afterEach, describe, expect, it, vi } from "vitest";

const cookieValue = vi.hoisted(() => ({ current: undefined as string | undefined, throws: false }));

vi.mock("next/headers", () => ({
  cookies: async () => {
    if (cookieValue.throws) throw new Error("not a request scope");
    return { get: () => (cookieValue.current ? { value: cookieValue.current } : undefined) };
  },
}));

import { resolveLocaleFromCookie } from "./resolve-locale.ts";

afterEach(() => {
  cookieValue.current = undefined;
  cookieValue.throws = false;
});

describe("resolveLocaleFromCookie", () => {
  it("returns the locale cookie value when it is a supported locale", async () => {
    cookieValue.current = "ja";
    expect(await resolveLocaleFromCookie()).toBe("ja");
  });

  it("falls back to the default locale for an unsupported value", async () => {
    cookieValue.current = "klingon";
    expect(await resolveLocaleFromCookie()).toBe("en");
  });

  it("falls back to the default locale outside a request scope (cookies() throws)", async () => {
    cookieValue.throws = true;
    expect(await resolveLocaleFromCookie()).toBe("en");
  });
});
