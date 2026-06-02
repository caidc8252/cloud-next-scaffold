import { beforeEach, describe, expect, it } from "vitest";
import {
  getMenus,
  getPermissionCatalog,
  getVisibleMenuTree,
  isKnownPermissionCode,
  registerAppManifest,
  resetRegistry,
  resolveEffectivePermissions,
  type AppManifest,
} from "../src/index.ts";

const fixture: AppManifest = {
  appId: "web",
  menus: [
    { menuCode: "system", menuTitle: "System", parentMenuCode: null, path: null, icon: "settings", contractTypes: ["*"], order: 100 },
    { menuCode: "users", menuTitle: "Users", parentMenuCode: "system", path: "/system/users", contractTypes: ["*"], order: 101, permissions: [{ code: "users.VIEW", label: "View Users" }, { code: "users.CREATE" }] },
    { menuCode: "roles", menuTitle: "Roles", parentMenuCode: "system", path: "/system/roles", contractTypes: ["ADMIN"], order: 102, permissions: [{ code: "roles.VIEW" }] },
    { menuCode: "reports", menuTitle: "Reports", parentMenuCode: null, path: null, contractTypes: ["ISO"], order: 200 },
    { menuCode: "sales", menuTitle: "Sales", parentMenuCode: "reports", path: "/reports/sales", contractTypes: ["ISO"], order: 201, permissions: [{ code: "sales.VIEW" }] },
  ],
};

describe("query", () => {
  beforeEach(() => {
    resetRegistry();
    registerAppManifest(fixture);
  });

  describe("getMenus / contract filter", () => {
    it("returns all menus when no contract filter is given", () => {
      expect(getMenus("web").map((m) => m.menuCode)).toEqual([
        "system",
        "users",
        "roles",
        "reports",
        "sales",
      ]);
    });

    it("filters by a single contract string (wildcard always matches)", () => {
      expect(getMenus("web", "ADMIN").map((m) => m.menuCode)).toEqual(["system", "users", "roles"]);
    });

    it("filters by an array of contracts", () => {
      expect(getMenus("web", ["ADMIN", "ISO"]).map((m) => m.menuCode)).toEqual([
        "system",
        "users",
        "roles",
        "reports",
        "sales",
      ]);
    });
  });

  describe("getPermissionCatalog", () => {
    it("groups by menu and only includes menus that have permissions", () => {
      const groups = getPermissionCatalog("web", "ADMIN");
      expect(groups.map((g) => g.menuCode)).toEqual(["users", "roles"]);
    });

    it("falls back to a derived label when none is provided", () => {
      const groups = getPermissionCatalog("web", "ADMIN");
      const users = groups.find((g) => g.menuCode === "users")!;
      expect(users.items.find((i) => i.code === "users.VIEW")!.label).toBe("View Users");
      expect(users.items.find((i) => i.code === "users.CREATE")!.label).toBe("Users Create");
    });
  });

  describe("resolveEffectivePermissions", () => {
    it("ADMIN gets every code in contract scope", () => {
      const perms = resolveEffectivePermissions({ platform: "web", contracts: "ADMIN", authorizingType: "ADMIN" });
      expect(perms.sort()).toEqual(["roles.VIEW", "users.CREATE", "users.VIEW"]);
    });

    it("NORMAL keeps only granted codes within contract scope", () => {
      const perms = resolveEffectivePermissions({
        platform: "web",
        contracts: "ADMIN",
        authorizingType: "NORMAL",
        grantedRoleCodes: ["users.VIEW", "sales.VIEW", "ghost"],
      });
      expect(perms).toEqual(["users.VIEW"]);
    });

    it("NORMAL with wider contracts admits codes from those contracts", () => {
      const perms = resolveEffectivePermissions({
        platform: "web",
        contracts: ["ADMIN", "ISO"],
        authorizingType: "NORMAL",
        grantedRoleCodes: ["sales.VIEW", "users.VIEW"],
      });
      expect(perms).toEqual(["sales.VIEW", "users.VIEW"]);
    });
  });

  describe("getVisibleMenuTree", () => {
    it("shows a leaf and its ancestors when a permission is granted, pruning empty groups", () => {
      const tree = getVisibleMenuTree("web", ["ADMIN", "ISO"], ["users.VIEW"]);
      expect(tree.map((n) => n.menuCode)).toEqual(["system"]);
      expect(tree[0].children.map((n) => n.menuCode)).toEqual(["users"]);
    });

    it("hides leaves whose permission is not granted", () => {
      const tree = getVisibleMenuTree("web", ["ISO"], ["sales.VIEW"]);
      expect(tree.map((n) => n.menuCode)).toEqual(["reports"]);
      expect(tree[0].children.map((n) => n.menuCode)).toEqual(["sales"]);
    });

    it("includes ancestor groups even if their own contract would not match the filter", () => {
      resetRegistry();
      registerAppManifest({
        appId: "web",
        menus: [
          { menuCode: "grp", menuTitle: "Group", parentMenuCode: null, path: null, contractTypes: ["ADMIN"], order: 1 },
          { menuCode: "leaf", menuTitle: "Leaf", parentMenuCode: "grp", path: "/leaf", contractTypes: ["ISO"], order: 2, permissions: [{ code: "leaf.VIEW" }] },
        ],
      });
      const tree = getVisibleMenuTree("web", ["ISO"], ["leaf.VIEW"]);
      expect(tree.map((n) => n.menuCode)).toEqual(["grp"]);
      expect(tree[0].children.map((n) => n.menuCode)).toEqual(["leaf"]);
    });
  });

  describe("isKnownPermissionCode", () => {
    it("returns true for a code present in the platform", () => {
      expect(isKnownPermissionCode("web", "users.VIEW")).toBe(true);
    });
    it("returns false for an unknown code", () => {
      expect(isKnownPermissionCode("web", "nope.X")).toBe(false);
    });
  });
});
