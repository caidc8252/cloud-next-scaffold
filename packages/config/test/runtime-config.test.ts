import { describe, expect, it } from "vitest";
import { parseRuntimeConfig } from "../src/runtime.ts";

describe("parseRuntimeConfig", () => {
  it("defaults local-only bypass switches to disabled", () => {
    expect(parseRuntimeConfig({})).toEqual({
      NODE_ENV: "development",
      CI: false,
      DEV_AUTH_BYPASS: false,
      DEV_AUTH_BYPASS_EMAIL: null,
    });
  });

  it("parses DEV_AUTH_BYPASS and CI as explicit runtime flags", () => {
    expect(
      parseRuntimeConfig({
        NODE_ENV: "test",
        DEV_AUTH_BYPASS: "1",
        DEV_AUTH_BYPASS_EMAIL: "admin@example.com",
        CI: "true",
      }),
    ).toEqual({
      NODE_ENV: "test",
      CI: true,
      DEV_AUTH_BYPASS: true,
      DEV_AUTH_BYPASS_EMAIL: "admin@example.com",
    });
  });
});
