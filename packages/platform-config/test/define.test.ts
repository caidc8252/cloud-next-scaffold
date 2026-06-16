import { describe, expect, it } from "vitest";
import { defineAppManifest, defineAppRoles } from "../src/index.ts";

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

describe("define — require + remark", () => {
  it("accepts a permission with require and a role with remark", () => {
    const m = defineAppManifest({
      contractKeys: ["ADMIN"],
      menus: [
        {
          menuCode: "x",
          menuTitle: "menu.x",
          parentMenuCode: null,
          path: "/x",
          contractTypes: ["ADMIN"],
          permissions: [
            { code: "x.view", label: "permission.xView", require: null },
            { code: "x.add", label: "permission.xAdd", require: "x.view" },
          ],
        },
      ],
    });
    expect(m.menus[0].permissions?.[1].require).toBe("x.view");

    const r = defineAppRoles([
      { roleId: 1, roleName: "role.x", remark: "role.xDesc", permissionCodes: [] },
    ]);
    expect(r[0].remark).toBe("role.xDesc");
  });

  it("rejects a role missing remark", () => {
    expect(() =>
      // @ts-expect-error -- intentionally invalid: missing remark
      defineAppRoles([{ roleId: 1, roleName: "role.x", permissionCodes: [] }]),
    ).toThrow();
  });
});
