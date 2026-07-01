import { describe, expect, it } from "vitest";
import { buildRegistry } from "./build-registry.ts";
import { validateCatalog } from "./validate-catalog.ts";
import type { ModuleManifest, MenuTreeNodeDecl } from "./registry-types.ts";

const menuTree: MenuTreeNodeDecl[] = [{ menuCode: "system", title: "menu.system", parentMenuCode: null, order: 100 }];
const roles: ModuleManifest = {
  moduleCategory: "system", moduleName: "roles", menuCode: "system.roles", title: "menu.roles",
  parentMenuCode: "system", entry: { url: "/roles" },
  permissions: [{ code: "system.roles.role.view", belongToMenuCode: "system.roles", label: "l", desc: "d" }],
};
const result = buildRegistry({ modules: [roles], menuTree });

describe("validateCatalog", () => {
  it("passes when refs exist", () => {
    const d = validateCatalog({ result, roleCodes: ["system.roles.role.view"], contractMenus: ["system.roles"] });
    expect(d.filter((x) => x.level === "error")).toEqual([]);
  });
  it("errors on a missing role code ref", () => {
    const d = validateCatalog({ result, roleCodes: ["system.roles.role.ghost"], contractMenus: ["system.roles"] });
    expect(d.some((x) => x.rule === "catalog-ref-missing")).toBe(true);
  });
  it("errors on a missing contract menu ref", () => {
    const d = validateCatalog({ result, roleCodes: [], contractMenus: ["system.ghost"] });
    expect(d.some((x) => x.rule === "contract-menu-missing")).toBe(true);
  });
  it("errors when a contract references a directory (non-leaf)", () => {
    const d = validateCatalog({ result, roleCodes: [], contractMenus: ["system"] });
    expect(d.some((x) => x.rule === "contract-menu-not-leaf")).toBe(true);
  });
  it("warns on a dead menu (leaf not referenced by any contract)", () => {
    const d = validateCatalog({ result, roleCodes: [], contractMenus: [] });
    expect(d.some((x) => x.rule === "dead-menu" && x.level === "warning")).toBe(true);
  });
});
