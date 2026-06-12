import { describe, expect, it } from "vitest";
import {
  getPortalLoginUrl,
  getPortalOnboardingUrl,
  getPortalSelectPartnerUrl,
} from "./portal-routing.ts";

function withPortalUrl<T>(value: string | undefined, fn: () => T): T {
  const original = process.env.PORTAL_APP_URL;
  if (value === undefined) {
    delete process.env.PORTAL_APP_URL;
  } else {
    process.env.PORTAL_APP_URL = value;
  }
  try {
    return fn();
  } finally {
    if (original === undefined) {
      delete process.env.PORTAL_APP_URL;
    } else {
      process.env.PORTAL_APP_URL = original;
    }
  }
}

describe("portal routing", () => {
  it("uses the local portal default", () => {
    withPortalUrl(undefined, () => {
      expect(getPortalLoginUrl()).toBe("http://localhost:3100/login");
      expect(getPortalSelectPartnerUrl()).toBe("http://localhost:3100/select-partner");
    });
  });

  it("builds a safe onboarding URL with an encoded token", () => {
    withPortalUrl("https://portal.example.com/base?x=1#old", () => {
      expect(getPortalOnboardingUrl("a b&c")).toBe(
        "https://portal.example.com/onboarding?token=a+b%26c",
      );
    });
  });

  it("rejects non-http portal URLs", () => {
    withPortalUrl("javascript:alert(1)", () => {
      expect(() => getPortalOnboardingUrl("tok")).toThrow("PORTAL_APP_URL must use http or https.");
    });
  });
});
