import { describe, expect, it } from "vitest";
import { defineAppManifest } from "../src/index.ts";

describe("defineAppManifest", () => {
  it("returns a frozen manifest for valid input", () => {
    const manifest = defineAppManifest({
      contractKeys: ["ADMIN"],
      menus: [
        { menuCode: "dashboard", menuTitle: "Dashboard", parentMenuCode: null, path: "/dashboard", contractTypes: ["*"] },
      ],
    });
    expect(Object.isFrozen(manifest)).toBe(true);
  });





  it("throws when a menu is missing required fields", () => {
    expect(() =>
      // @ts-expect-error -- intentionally invalid: missing menuTitle
      defineAppManifest({  contractKeys: ["ADMIN"], menus: [{ menuCode: "x", parentMenuCode: null, contractTypes: ["*"] }] }),
    ).toThrow();
  });

  it("accepts empty contractTypes ([] = universal, replaces old `*`)", () => {
    const manifest = defineAppManifest({
      contractKeys: ["ADMIN"],
      menus: [{ menuCode: "x", menuTitle: "X", parentMenuCode: null, path: "/x", contractTypes: [] }],
    });
    expect(manifest.menus[0].contractTypes).toEqual([]);
  });
});
