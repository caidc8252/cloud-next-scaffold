import { describe, expect, it } from "vitest";
import { createPlatformConfig, type MenuEntry } from "../src/index.ts";

const CONTRACTS = ["ADMIN", "ISO", "ISV", "MERCHANT"] as const;

const MENUS: MenuEntry[] = [
  { menuCode: "home", menuTitle: "Home", parentMenuCode: null, path: null, contractTypes: ["*"], order: 1 },
  { menuCode: "dash", menuTitle: "Dash", parentMenuCode: "home", path: "/dash", contractTypes: ["*"], order: 2, permissions: [{ code: "dash.VIEW" }] },
  { menuCode: "roles", menuTitle: "Roles", parentMenuCode: "home", path: "/roles", contractTypes: ["ADMIN"], order: 3, permissions: [{ code: "roles.VIEW" }] },
  { menuCode: "sales", menuTitle: "Sales", parentMenuCode: "home", path: "/sales", contractTypes: ["ISO"], order: 4, permissions: [{ code: "sales.VIEW" }] },
];

describe("createPlatformConfig", () => {
  it("getMenus() returns the whole flat menu pool", () => {
    const cfg = createPlatformConfig(MENUS, { contractTypes: CONTRACTS });
    expect(cfg.getMenus().map((m) => m.menuCode)).toEqual(["home", "dash", "roles", "sales"]);
  });

  it("getMenus(contract) returns wildcard menus plus that contract's menus", () => {
    const cfg = createPlatformConfig(MENUS, { contractTypes: CONTRACTS });
    expect(cfg.getMenus("ADMIN").map((m) => m.menuCode)).toEqual(["home", "dash", "roles"]);
  });

  it("getMenus([...]) matches any of the given contracts", () => {
    const cfg = createPlatformConfig(MENUS, { contractTypes: CONTRACTS });
    expect(cfg.getMenus(["ISO"]).map((m) => m.menuCode)).toEqual(["home", "dash", "sales"]);
  });

  it("getContractKeys() returns the configured contract keys", () => {
    const cfg = createPlatformConfig(MENUS, { contractTypes: CONTRACTS });
    expect(cfg.getContractKeys()).toEqual(["ADMIN", "ISO", "ISV", "MERCHANT"]);
  });

  it("validates the menu pool at construction (throws on a bad menu)", () => {
    expect(() =>
      createPlatformConfig(
        [{ menuCode: "x", menuTitle: "X", parentMenuCode: "missing", path: "/x", contractTypes: ["*"] }],
        { contractTypes: CONTRACTS },
      ),
    ).toThrow(/missing parent/);
  });

  it("rejects a globally duplicate menuCode across the aggregated pool", () => {
    expect(() =>
      createPlatformConfig(
        [
          { menuCode: "dup", menuTitle: "A", parentMenuCode: null, path: "/a", contractTypes: ["*"] },
          { menuCode: "dup", menuTitle: "B", parentMenuCode: null, path: "/b", contractTypes: ["*"] },
        ],
        { contractTypes: CONTRACTS },
      ),
    ).toThrow(/duplicate menuCode "dup"/);
  });

  it("getMenus() returns a copy that cannot mutate internal state", () => {
    const cfg = createPlatformConfig(MENUS, { contractTypes: CONTRACTS });
    cfg.getMenus().push({ menuCode: "x", menuTitle: "X", parentMenuCode: null, path: "/x", contractTypes: ["*"] });
    expect(cfg.getMenus().map((m) => m.menuCode)).toEqual(["home", "dash", "roles", "sales"]);
  });
});
