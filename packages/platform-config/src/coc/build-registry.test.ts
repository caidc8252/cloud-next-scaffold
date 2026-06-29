import { describe, expect, it } from "vitest";
import { buildRegistry } from "./build-registry.ts";
import type { ModuleManifest, MenuTreeNodeDecl } from "./registry-types.ts";

const menuTree: MenuTreeNodeDecl[] = [{ menuCode: "system", title: "menu.system", parentMenuCode: null, order: 100 }];
const roles: ModuleManifest = {
  moduleCategory: "system", moduleName: "roles", menuCode: "system.roles", title: "menu.roles",
  parentMenuCode: "system", icon: "shield", order: 101, entry: { url: "/roles" },
  permissions: [{ code: "system.roles.role.view", belongToMenuCode: "system.roles", label: "permission.rolesView", desc: "permission.rolesViewDesc" }],
};

describe("buildRegistry", () => {
  it("assembles permission + menu registries and sorted unions", () => {
    const r = buildRegistry({ modules: [roles], menuTree });
    expect(r.diagnostics.filter((d) => d.level === "error")).toEqual([]);
    expect(r.permissionCodeUnion).toEqual(["system.roles.role.view"]);
    expect(r.menuCodeUnion).toEqual(["system", "system.roles"]);
    expect(r.menuRegistry["system.roles"]!.path).toBe("/roles");
    expect(r.menuRegistry["system"]!.path).toBeNull();
    expect(r.permissionRegistry["system.roles.role.view"]!.belongToMenuCode).toBe("system.roles");
  });

  it("errors on duplicate permission_code", () => {
    const dup = { ...roles, moduleName: "roles2", menuCode: "system.roles" };
    const r = buildRegistry({ modules: [roles, dup as ModuleManifest], menuTree });
    expect(r.diagnostics.some((d) => d.rule === "duplicate-code")).toBe(true);
  });

  it("errors when belongToMenuCode != menuCode", () => {
    const bad: ModuleManifest = { ...roles, permissions: [{ ...roles.permissions[0]!, belongToMenuCode: "system.other" }] };
    const r = buildRegistry({ modules: [bad], menuTree });
    expect(r.diagnostics.some((d) => d.rule === "belongs-to-menu-rule")).toBe(true);
  });

  it("errors when a leaf parent is missing from the tree", () => {
    const r = buildRegistry({ modules: [{ ...roles, parentMenuCode: "ghost" }], menuTree });
    expect(r.diagnostics.some((d) => d.rule === "parent-missing")).toBe(true);
  });

  it("retains a vanished real code as deprecated and flags deleted-without-deprecated", () => {
    const prev = buildRegistry({ modules: [roles], menuTree });
    const r = buildRegistry({ modules: [{ ...roles, permissions: [] }], menuTree, previous: prev });
    expect(r.permissionRegistry["system.roles.role.view"]!.deprecated).toBe(true);
    expect(r.permissionCodeUnion).toContain("system.roles.role.view");
    expect(r.diagnostics.some((d) => d.rule === "deleted-without-deprecated")).toBe(true);
  });
});
