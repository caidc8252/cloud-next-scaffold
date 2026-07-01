import { describe, expect, it } from "vitest";
import { buildRegistry } from "./build-registry.ts";
import { deriveContractScope } from "./contract-scope.ts";
import type { ModuleManifest, MenuTreeNodeDecl } from "./registry-types.ts";

const menuTree: MenuTreeNodeDecl[] = [{ menuCode: "system", title: "menu.system", parentMenuCode: null, order: 100 }];
const mk = (mod: string, code: string): ModuleManifest => ({
  moduleCategory: "system", moduleName: mod, menuCode: `system.${mod}`, title: `menu.${mod}`,
  parentMenuCode: "system", entry: { url: `/${mod}` },
  permissions: [{ code, belongToMenuCode: `system.${mod}`, label: "l", desc: "d" }],
});
const result = buildRegistry({ modules: [mk("roles", "system.roles.role.view"), mk("users", "system.users.user.view")], menuTree });

describe("deriveContractScope", () => {
  it("expands each contract's menus into their permission codes", () => {
    const scope = deriveContractScope({ ADMIN: ["system.roles", "system.users"], "US-ISO": ["system.users"] }, result);
    expect(scope.ADMIN).toEqual(["system.roles.role.view", "system.users.user.view"]);
    expect(scope["US-ISO"]).toEqual(["system.users.user.view"]);
  });
});
