import { describe, expect, it } from "vitest";
import { defineModule, defineMenuTree } from "./define-module.ts";

describe("defineModule", () => {
  it("freezes a valid manifest", () => {
    const m = defineModule({
      moduleCategory: "system", moduleName: "roles", menuCode: "system.roles",
      parentMenuCode: "system", entry: { url: "/roles" },
      permissions: [{ code: "system.roles.role.view", belongToMenuCode: "system.roles" }],
    });
    expect(Object.isFrozen(m)).toBe(true);
    expect(m.menuCode).toBe("system.roles");
  });

  it("rejects a manifest missing menuCode", () => {
    // @ts-expect-error 故意缺字段
    expect(() => defineModule({ moduleCategory: "system", moduleName: "roles", parentMenuCode: "system", entry: { url: "/r" }, permissions: [] })).toThrow();
  });
});

describe("defineMenuTree", () => {
  it("freezes a valid directory skeleton", () => {
    const t = defineMenuTree([{ menuCode: "system", parentMenuCode: null, order: 100 }]);
    expect(Object.isFrozen(t)).toBe(true);
    expect(t[0]!.menuCode).toBe("system");
  });
});
