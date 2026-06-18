import { describe, expect, it } from "vitest";
import {
  getPortalBaseUrl,
  getPortalLoginUrl,
  getPortalOnboardingUrl,
  getPortalResetPasswordUrl,
  getPortalSelectPartnerUrl,
} from "./portal-routing.ts";

function withPortalUrl<T>(value: string | undefined, fn: () => T): T {
  const original = process.env.NEXT_PORTAL_URL;
  if (value === undefined) {
    delete process.env.NEXT_PORTAL_URL;
  } else {
    process.env.NEXT_PORTAL_URL = value;
  }
  try {
    return fn();
  } finally {
    if (original === undefined) {
      delete process.env.NEXT_PORTAL_URL;
    } else {
      process.env.NEXT_PORTAL_URL = original;
    }
  }
}

describe("portal routing", () => {
  it("uses the local portal default", () => {
    withPortalUrl(undefined, () => {
      expect(getPortalLoginUrl()).toBe("http://127.0.0.1:3100/login");
      expect(getPortalSelectPartnerUrl()).toBe("http://127.0.0.1:3100/select-partner");
    });
  });

  it("builds a safe onboarding URL with an encoded token", () => {
    withPortalUrl("https://portal.example.com/base?x=1#old", () => {
      expect(getPortalOnboardingUrl("a b&c")).toBe(
        "https://portal.example.com/onboarding?token=a+b%26c",
      );
    });
  });

  it("builds a safe reset-password URL with an encoded token, same host as onboarding", () => {
    withPortalUrl("https://portal.example.com/base?x=1#old", () => {
      expect(getPortalResetPasswordUrl("a b&c")).toBe(
        "https://portal.example.com/reset-password?token=a+b%26c",
      );
    });
  });

  it("exposes the portal origin for client-built links (no path)", () => {
    withPortalUrl(undefined, () => {
      expect(getPortalBaseUrl()).toBe("http://127.0.0.1:3100");
    });
    withPortalUrl("https://portal.example.com/base", () => {
      expect(getPortalBaseUrl()).toBe("https://portal.example.com");
    });
  });

  it("rejects non-http portal URLs", () => {
    withPortalUrl("javascript:alert(1)", () => {
      expect(() => getPortalOnboardingUrl("tok")).toThrow("NEXT_PORTAL_URL must use http or https.");
    });
  });
});
