import { describe, expect, it } from "vitest";
import { buildRegistry } from "./build-registry.ts";
import type { ModuleManifest, MenuTreeNodeDecl } from "./registry-types.ts";

const menuTree: MenuTreeNodeDecl[] = [{ menuCode: "system", parentMenuCode: null, order: 100 }];
const roles: ModuleManifest = {
  moduleCategory: "system", moduleName: "roles", menuCode: "system.roles",
  parentMenuCode: "system", icon: "shield", order: 101, entry: { url: "/roles" },
  permissions: [{ code: "system.roles.role.view", belongToMenuCode: "system.roles" }],
};

describe("buildRegistry", () => {
  it("assembles registries with derived i18n keys and sorted unions", () => {
    const r = buildRegistry({ modules: [roles], menuTree });
    expect(r.diagnostics.filter((d) => d.level === "error")).toEqual([]);
    expect(r.menuRegistry["system.roles"]!.title).toBe("menu.system_roles");
    expect(r.menuRegistry["system"]!.title).toBe("menu.system");
    expect(r.permissionRegistry["system.roles.role.view"]!.label).toBe("permission.system_roles_role_view_label");
    expect(r.permissionRegistry["system.roles.role.view"]!.desc).toBe("permission.system_roles_role_view_desc");
    expect(r.menuRegistry["system.roles"]!.path).toBe("/roles");
    expect(r.menuRegistry["system"]!.path).toBeNull();
  });

  it("errors on duplicate permission_code with a descriptive message", () => {
    const dup = { ...roles, moduleName: "roles2" };
    const r = buildRegistry({ modules: [roles, dup as ModuleManifest], menuTree });
    const d = r.diagnostics.find((x) => x.rule === "duplicate-code");
    expect(d?.level).toBe("error");
    expect(d?.message).toContain("system.roles.role.view");
    expect(d?.message).toContain("roles");
    expect(d?.message).toContain("roles2");
  });

  it("errors on duplicate menuCode across skeleton and module", () => {
    const clash: MenuTreeNodeDecl[] = [
      { menuCode: "system", parentMenuCode: null, order: 100 },
      { menuCode: "system.roles", parentMenuCode: "system", order: 1 },
    ];
    const r = buildRegistry({ modules: [roles], menuTree: clash });
    const d = r.diagnostics.find((x) => x.rule === "duplicate-menu-code");
    expect(d?.level).toBe("error");
    expect(d?.message).toContain("system.roles");
  });

  it("errors when a code contains an underscore (breaks derivation injectivity)", () => {
    const bad: ModuleManifest = { ...roles, permissions: [{ code: "system.roles.role.view_all", belongToMenuCode: "system.roles" }] };
    const r = buildRegistry({ modules: [bad], menuTree });
    const d = r.diagnostics.find((x) => x.rule === "code-underscore");
    expect(d?.level).toBe("error");
    expect(d?.message).toContain("view_all");
  });

  it("errors when the skeleton exceeds two levels", () => {
    const deep: MenuTreeNodeDecl[] = [
      { menuCode: "platform", parentMenuCode: null, order: 1 },
      { menuCode: "platform.group", parentMenuCode: "platform", order: 2 },
      { menuCode: "platform.group.sub", parentMenuCode: "platform.group", order: 3 },
    ];
    const r = buildRegistry({ modules: [], menuTree: deep });
    const d = r.diagnostics.find((x) => x.rule === "menu-depth");
    expect(d?.level).toBe("error");
    expect(d?.message).toContain("platform.group.sub");
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
});
