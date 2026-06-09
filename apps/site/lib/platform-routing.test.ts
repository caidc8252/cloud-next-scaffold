import { describe, expect, it } from "vitest";
import { getWebAppUrl } from "./platform-routing";

describe("getWebAppUrl", () => {
  it("returns the configured web app URL", () => {
    const original = process.env.WEB_APP_URL;
    process.env.WEB_APP_URL = "https://console.example.com";

    try {
      expect(getWebAppUrl()).toBe("https://console.example.com/");
    } finally {
      process.env.WEB_APP_URL = original;
    }
  });

  it("rejects non-http protocols", () => {
    const original = process.env.WEB_APP_URL;
    process.env.WEB_APP_URL = "javascript:alert(1)";

    try {
      expect(() => getWebAppUrl()).toThrow("WEB_APP_URL must use http or https.");
    } finally {
      process.env.WEB_APP_URL = original;
    }
  });
});
