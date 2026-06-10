import { describe, expect, it } from "vitest";
import { getAdminAppUrl } from "./platform-routing";

describe("getAdminAppUrl", () => {
  it("returns the configured admin app URL", () => {
    const original = process.env.ADMIN_APP_URL;
    process.env.ADMIN_APP_URL = "https://console.example.com";

    try {
      expect(getAdminAppUrl()).toBe("https://console.example.com/");
    } finally {
      process.env.ADMIN_APP_URL = original;
    }
  });

  it("rejects non-http protocols", () => {
    const original = process.env.ADMIN_APP_URL;
    process.env.ADMIN_APP_URL = "javascript:alert(1)";

    try {
      expect(() => getAdminAppUrl()).toThrow("ADMIN_APP_URL must use http or https.");
    } finally {
      process.env.ADMIN_APP_URL = original;
    }
  });
});
