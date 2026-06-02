import { describe, expect, it } from "vitest";
import { defineAppManifest } from "../src/index.ts";

describe("defineAppManifest", () => {
  it("returns a frozen manifest for valid input", () => {
    const manifest = defineAppManifest({
      appId: "web",
      menus: [
        { menuCode: "dashboard", menuTitle: "Dashboard", parentMenuCode: null, path: "/dashboard", contractTypes: ["*"] },
      ],
    });
    expect(manifest.appId).toBe("web");
    expect(Object.isFrozen(manifest)).toBe(true);
  });

  it("throws on empty appId", () => {
    expect(() => defineAppManifest({ appId: "", menus: [] })).toThrow();
  });

  it("throws when a menu is missing required fields", () => {
    expect(() =>
      // @ts-expect-error -- intentionally invalid: missing menuTitle
      defineAppManifest({ appId: "web", menus: [{ menuCode: "x", parentMenuCode: null, contractTypes: ["*"] }] }),
    ).toThrow();
  });

  it("throws on empty contractTypes", () => {
    expect(() =>
      defineAppManifest({
        appId: "web",
        menus: [{ menuCode: "x", menuTitle: "X", parentMenuCode: null, path: "/x", contractTypes: [] }],
      }),
    ).toThrow();
  });
});
