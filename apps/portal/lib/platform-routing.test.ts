import { describe, expect, it } from "vitest";
import { appUrlForGroup, entryUrlForParty } from "./platform-routing";

describe("appUrlForGroup", () => {
  it("returns the configured app URL for a group", () => {
    const original = process.env.NEXT_ADMIN_URL;
    process.env.NEXT_ADMIN_URL = "https://admin.example.com";
    try {
      expect(appUrlForGroup("ADMIN")).toBe("https://admin.example.com");
    } finally {
      process.env.NEXT_ADMIN_URL = original;
    }
  });

  it("rejects non-http protocols", () => {
    const original = process.env.NEXT_CUSTOMER_URL;
    process.env.NEXT_CUSTOMER_URL = "javascript:alert(1)";
    try {
      expect(() => appUrlForGroup("CUSTOMER")).toThrow("NEXT_CUSTOMER_URL must use http or https.");
    } finally {
      process.env.NEXT_CUSTOMER_URL = original;
    }
  });

  it("throws when a group has no configured URL nor default (merchant)", () => {
    const original = process.env.NEXT_MERCHANT_URL;
    delete process.env.NEXT_MERCHANT_URL;
    try {
      expect(() => appUrlForGroup("MERCHANT")).toThrow("NEXT_MERCHANT_URL is not configured");
    } finally {
      if (original !== undefined) process.env.NEXT_MERCHANT_URL = original;
    }
  });
});

describe("entryUrlForParty", () => {
  it("builds the target console's handoff route with the token (方案 B)", () => {
    const original = process.env.NEXT_CUSTOMER_URL;
    process.env.NEXT_CUSTOMER_URL = "https://customer.example.com/x";
    try {
      expect(entryUrlForParty("CUSTOMER", "handoff-token")).toBe(
        "https://customer.example.com/api/auth/session-handoff?token=handoff-token",
      );
    } finally {
      process.env.NEXT_CUSTOMER_URL = original;
    }
  });
});
