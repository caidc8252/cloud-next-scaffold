import { describe, expect, it } from "vitest";
import { createCocConfig } from "./create-coc-config.ts";
import type { GeneratedMenuEntry } from "./registry-types.ts";

const menuRegistry: Record<string, GeneratedMenuEntry> = {
  system: { menuCode: "system", title: "menu.system", parentMenuCode: null, path: null, icon: "settings", order: 100 },
  "system.roles": { menuCode: "system.roles", title: "menu.roles", parentMenuCode: "system", path: "/roles", icon: "shield", order: 101 },
  "system.users": { menuCode: "system.users", title: "menu.users", parentMenuCode: "system", path: "/users", icon: "users", order: 102 },
};
const cfg = createCocConfig({
  menuRegistry,
  contractScope: { ADMIN: ["system.roles.role.view", "system.users.user.view"], "US-ISO": ["system.users.user.view"] },
  globalRoles: [{ roleId: 1, permissionCodes: ["system.roles.role.view", "system.users.user.view"] }],
  codeToMenu: (c) => c.split(".").slice(0, 2).join("."),
});

describe("createCocConfig", () => {
  it("resolveRolePermissions returns a global role's codes", () => {
    expect(cfg.resolveRolePermissions(1)).toEqual(["system.roles.role.view", "system.users.user.view"]);
    expect(cfg.resolveRolePermissions(999)).toBeUndefined();
  });
  it("resolvePartyScope unions the contracts' codes", () => {
    expect([...cfg.resolvePartyScope(["ADMIN"])].sort()).toEqual(["system.roles.role.view", "system.users.user.view"]);
    expect([...cfg.resolvePartyScope("US-ISO")]).toEqual(["system.users.user.view"]);
  });
  it("buildMenuTree projects only visible leaves + their ancestors, pruning empty dirs", () => {
    const tree = cfg.buildMenuTree(["system.users.user.view"]); // 只命中 users
    expect(tree).toHaveLength(1);
    expect(tree[0]!.menuCode).toBe("system");
    expect(tree[0]!.children.map((c) => c.menuCode)).toEqual(["system.users"]); // roles 被裁
  });
});
