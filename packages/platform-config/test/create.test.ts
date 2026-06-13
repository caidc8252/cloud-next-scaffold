import { describe, expect, it } from "vitest";
import { createPlatformConfig, type MenuEntry } from "../src/index.ts";

const CONTRACTS = ["ADMIN", "ISO", "ISV", "MERCHANT"] as const;

const MENUS: MenuEntry[] = [
  { menuCode: "home", menuTitle: "Home", parentMenuCode: null, path: null, contractTypes: [], order: 1 },
  { menuCode: "dash", menuTitle: "Dash", parentMenuCode: "home", path: "/dash", contractTypes: ["ADMIN", "ISO"], order: 2, permissions: [{ code: "dash.VIEW" }] },
  { menuCode: "roles", menuTitle: "Roles", parentMenuCode: "home", path: "/roles", contractTypes: ["ADMIN"], order: 3, permissions: [{ code: "roles.VIEW" }] },
  { menuCode: "sales", menuTitle: "Sales", parentMenuCode: "home", path: "/sales", contractTypes: ["ISO"], order: 4, permissions: [{ code: "sales.VIEW" }] },
];

describe("createPlatformConfig", () => {
  it("getMenus() returns the whole flat menu pool", () => {
    const cfg = createPlatformConfig(MENUS, { contractTypes: CONTRACTS });
    expect(cfg.getMenus().map((m) => m.menuCode)).toEqual(["home", "dash", "roles", "sales"]);
  });

  it("getMenus(contract) returns universal ([]) menus plus that contract's menus", () => {
    const cfg = createPlatformConfig(MENUS, { contractTypes: CONTRACTS });
    expect(cfg.getMenus("ADMIN").map((m) => m.menuCode)).toEqual(["home", "dash", "roles"]);
  });

  it("getMenus([...]) matches any of the given contracts", () => {
    const cfg = createPlatformConfig(MENUS, { contractTypes: CONTRACTS });
    expect(cfg.getMenus(["ISO"]).map((m) => m.menuCode)).toEqual(["home", "dash", "sales"]);
  });

  it("treats a literal \"*\" as an ordinary (non-matching) contract, not a wildcard", () => {
    const cfg = createPlatformConfig(
      [{ menuCode: "x", menuTitle: "X", parentMenuCode: null, path: "/x", contractTypes: ["*"] }],
      { contractTypes: ["*", "ADMIN"] },
    );
    expect(cfg.getMenus("ADMIN").map((m) => m.menuCode)).toEqual([]);
  });

  it("getRoles / resolveRolePermissions expose the coded role registry (non-preset role kept as-is)", () => {
    const cfg = createPlatformConfig(MENUS, {
      contractTypes: CONTRACTS,
      roles: [{ roleId: 2, roleName: "Operator", permissionCodes: ["dash.VIEW"] }],
    });
    expect(cfg.getRoles().map((r) => r.roleId)).toEqual([2]);
    expect(cfg.resolveRolePermissions(2)).toEqual(["dash.VIEW"]);
    expect(cfg.resolveRolePermissions(999)).toBeUndefined();
  });

  it("fills a preset admin role (roleId 1) with its whole group's permission codes", () => {
    const cfg = createPlatformConfig(MENUS, {
      contractTypes: CONTRACTS,
      roles: [{ roleId: 1, roleName: "Administrator", permissionCodes: [] }],
    });
    // roleId 1 ∈ ADMIN 组 → 填充 ADMIN 组（仅 "ADMIN" 契约）可达菜单的码：dash.VIEW + roles.VIEW（sales.VIEW 属 ISO，排除）。
    expect(cfg.resolveRolePermissions(1)!.slice().sort()).toEqual(["dash.VIEW", "roles.VIEW"]);
    expect(cfg.getRoles()[0].permissionCodes.slice().sort()).toEqual(["dash.VIEW", "roles.VIEW"]);
  });

  it("getContractKeys() returns the configured contract keys", () => {
    const cfg = createPlatformConfig(MENUS, { contractTypes: CONTRACTS });
    expect(cfg.getContractKeys()).toEqual(["ADMIN", "ISO", "ISV", "MERCHANT"]);
  });

  it("validates the menu pool at construction (throws on a bad menu)", () => {
    expect(() =>
      createPlatformConfig(
        [{ menuCode: "x", menuTitle: "X", parentMenuCode: "missing", path: "/x", contractTypes: [] }],
        { contractTypes: CONTRACTS },
      ),
    ).toThrow(/missing parent/);
  });

  it("rejects a globally duplicate menuCode across the aggregated pool", () => {
    expect(() =>
      createPlatformConfig(
        [
          { menuCode: "dup", menuTitle: "A", parentMenuCode: null, path: "/a", contractTypes: [] },
          { menuCode: "dup", menuTitle: "B", parentMenuCode: null, path: "/b", contractTypes: [] },
        ],
        { contractTypes: CONTRACTS },
      ),
    ).toThrow(/duplicate menuCode "dup"/);
  });

  it("getMenus() returns a copy that cannot mutate internal state", () => {
    const cfg = createPlatformConfig(MENUS, { contractTypes: CONTRACTS });
    cfg.getMenus().push({ menuCode: "x", menuTitle: "X", parentMenuCode: null, path: "/x", contractTypes: [] });
    expect(cfg.getMenus().map((m) => m.menuCode)).toEqual(["home", "dash", "roles", "sales"]);
  });
});

describe("resolvePartyScope", () => {
  it("collects permission codes from menus visible to the given contracts", () => {
    const cfg = createPlatformConfig(MENUS, { contractTypes: CONTRACTS });
    const adminScope = cfg.resolvePartyScope(["ADMIN"]);
    expect(adminScope.has("dash.VIEW")).toBe(true);
    expect(adminScope.has("roles.VIEW")).toBe(true);
    expect(adminScope.has("sales.VIEW")).toBe(false); // ISO-only 菜单不进 ADMIN scope
  });

  it("scopes a different contract to its own menus (group isolation)", () => {
    const cfg = createPlatformConfig(MENUS, { contractTypes: CONTRACTS });
    const isoScope = cfg.resolvePartyScope(["ISO"]);
    expect(isoScope.has("sales.VIEW")).toBe(true);
    expect(isoScope.has("roles.VIEW")).toBe(false); // ADMIN-only 菜单不进 ISO scope
  });
});
