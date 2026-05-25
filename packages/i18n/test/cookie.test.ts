import { describe, expect, it } from "vitest";
import {
  isValidIanaTimeZone,
  readLocaleCookie,
  readTimeZoneCookie,
} from "../src/cookie.ts";
import { defaultLocale } from "../src/index.ts";

function makeStore(entries: Record<string, string>) {
  return {
    get(name: string) {
      const value = entries[name];
      return value === undefined ? undefined : { value };
    },
  };
}

describe("readLocaleCookie", () => {
  it("returns the cookie locale when valid", () => {
    expect(readLocaleCookie(makeStore({ locale: "zh-CN" }))).toBe("zh-CN");
    expect(readLocaleCookie(makeStore({ locale: "ja" }))).toBe("ja");
    expect(readLocaleCookie(makeStore({ locale: "en" }))).toBe("en");
  });

  it("falls back to default for invalid / missing values", () => {
    expect(readLocaleCookie(makeStore({}))).toBe(defaultLocale);
    expect(readLocaleCookie(makeStore({ locale: "fr" }))).toBe(defaultLocale);
    expect(readLocaleCookie(makeStore({ locale: "" }))).toBe(defaultLocale);
  });
});

describe("readTimeZoneCookie", () => {
  it("returns the cookie tz when it is a valid IANA name", () => {
    expect(readTimeZoneCookie(makeStore({ tz: "Asia/Shanghai" }))).toBe(
      "Asia/Shanghai",
    );
    expect(readTimeZoneCookie(makeStore({ tz: "Asia/Tokyo" }))).toBe("Asia/Tokyo");
  });

  it("falls back to UTC for missing / invalid values", () => {
    expect(readTimeZoneCookie(makeStore({}))).toBe("UTC");
    expect(readTimeZoneCookie(makeStore({ tz: "Not/AZone" }))).toBe("UTC");
  });

  it("honors a custom fallback", () => {
    expect(readTimeZoneCookie(makeStore({}), "Asia/Shanghai")).toBe(
      "Asia/Shanghai",
    );
  });
});

describe("isValidIanaTimeZone", () => {
  it("accepts well-known zones", () => {
    expect(isValidIanaTimeZone("UTC")).toBe(true);
    expect(isValidIanaTimeZone("Asia/Tokyo")).toBe(true);
  });

  it("rejects garbage", () => {
    expect(isValidIanaTimeZone("Not/AZone")).toBe(false);
    expect(isValidIanaTimeZone("'); DROP TABLE users;")).toBe(false);
  });
});
