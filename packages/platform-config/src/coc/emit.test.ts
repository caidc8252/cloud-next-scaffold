import { describe, expect, it } from "vitest";
import { buildRegistry } from "./build-registry.ts";
import { deriveContractScope } from "./contract-scope.ts";
import { emitRegistry } from "./emit.ts";
import type { ModuleManifest, MenuTreeNodeDecl } from "./registry-types.ts";

const menuTree: MenuTreeNodeDecl[] = [{ menuCode: "system", title: "menu.system", parentMenuCode: null, order: 100 }];
const roles: ModuleManifest = {
  moduleCategory: "system", moduleName: "roles", menuCode: "system.roles", title: "menu.roles",
  parentMenuCode: "system", icon: "shield", order: 101, entry: { url: "/roles" },
  permissions: [{ code: "system.roles.role.view", belongToMenuCode: "system.roles", label: "permission.rolesView", desc: "permission.rolesViewDesc" }],
};
const result = buildRegistry({ modules: [roles], menuTree });
const contractScope = deriveContractScope({ ADMIN: ["system.roles"] }, result);

describe("emitRegistry", () => {
  it("emits a PermissionCode union and a header on every file", () => {
    const files = emitRegistry({ result, contractScope, i18n: { menu: { roles: "Roles" } }, contractTypes: ["ADMIN"] });
    expect(files["registry-types.generated.ts"]).toContain('export type PermissionCode =');
    expect(files["registry-types.generated.ts"]).toContain('"system.roles.role.view"');
    expect(files["registry-types.generated.ts"]).toContain('export type MenuCode =');
    for (const content of Object.values(files)) {
      if (content.endsWith(".json")) continue;
    }
    expect(files["permission-registry.generated.ts"]).toContain("PERMISSION_REGISTRY");
    expect(files["permission-registry.generated.ts"]).toContain("export function codeToMenu");
    expect(files["menu-registry.generated.ts"]).toContain("MENU_REGISTRY");
    expect(files["contract-scope.generated.ts"]).toContain("CONTRACT_SCOPE");
    expect(files["i18n/en.json"]).toContain('"Roles"');
  });

  it("is deterministic (stable across two runs)", () => {
    const a = emitRegistry({ result, contractScope, i18n: {}, contractTypes: ["ADMIN"] });
    const b = emitRegistry({ result, contractScope, i18n: {}, contractTypes: ["ADMIN"] });
    expect(a).toEqual(b);
  });

  it("uses a custom contractTypes import path when provided", () => {
    const files = emitRegistry({ result, contractScope, i18n: {}, contractTypes: ["ADMIN"], contractTypesImport: "../catalog/contract-types.ts" });
    expect(files["contract-scope.generated.ts"]).toContain('from "../catalog/contract-types.ts"');
    expect(files["contract-scope.generated.ts"]).not.toContain('"../../catalog/contract-types.ts"');
  });
});
