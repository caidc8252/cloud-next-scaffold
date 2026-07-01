import { describe, expect, it } from "vitest";
import { buildRegistry, deriveContractScope, validateCatalog } from "@cloud/platform-config";
import { collected } from "./collect.ts";

const result = buildRegistry({ modules: collected.modules, menuTree: collected.menuTree });

describe("CoC author sources (collect)", () => {
  it("buildRegistry produces no error diagnostics", () => {
    expect(result.diagnostics.filter((d) => d.level === "error")).toEqual([]);
  });
  it("exposes the migrated permission + menu unions", () => {
    expect(result.permissionCodeUnion).toContain("system.roles.role.create");
    expect(result.permissionCodeUnion).toContain("system.users.user.changeRole");
    expect(result.menuCodeUnion).toEqual(["system", "system.roles", "system.users"]);
  });
  it("validateCatalog passes for declared roles + contracts (no errors)", () => {
    const roleCodes = [...new Set(collected.globalRoles.flatMap((r) => r.permissionCodes))];
    const contractMenus = [...new Set(Object.values(collected.contractMenus).flat())];
    const diags = validateCatalog({ result, roleCodes, contractMenus });
    expect(diags.filter((d) => d.level === "error")).toEqual([]);
  });
  it("deriveContractScope gates roles behind ADMIN only", () => {
    const scope = deriveContractScope(collected.contractMenus, result);
    expect(scope.ADMIN).toContain("system.roles.role.view");
    expect(scope.ADMIN).toContain("system.users.user.view");
    expect(scope["US-ISO"]).not.toContain("system.roles.role.view");
    expect(scope["US-ISO"]).toContain("system.users.user.view");
  });
});
