import { describe, expect, it } from "vitest";
import type { AppManifest } from "@cloud/platform-config";
import {
  resolveEffectivePermissions,
  selectPermissionGroups,
  selectVisibleMenuTree,
} from "@/manifest/select";

const fixture: AppManifest = {
  appId: "web",
  contractKeys: ["ADMIN", "ISO"],
  menus: [
    { menuCode: "system", menuTitle: "System", parentMenuCode: null, path: null, icon: "settings", contractTypes: ["*"], order: 100 },
    { menuCode: "users", menuTitle: "Users", parentMenuCode: "system", path: "/system/users", contractTypes: ["*"], order: 101, permissions: [{ code: "users.VIEW", label: "View Users" }, { code: "users.CREATE" }] },
    { menuCode: "roles", menuTitle: "Roles", parentMenuCode: "system", path: "/system/roles", contractTypes: ["ADMIN"], order: 102, permissions: [{ code: "roles.VIEW" }] },
    { menuCode: "reports", menuTitle: "Reports", parentMenuCode: null, path: null, contractTypes: ["ISO"], order: 200 },
    { menuCode: "sales", menuTitle: "Sales", parentMenuCode: "reports", path: "/reports/sales", contractTypes: ["ISO"], order: 201, permissions: [{ code: "sales.VIEW" }] },
  ],
};

describe("selectPermissionGroups", () => {
  it("groups by menu and only includes menus that have permissions", () => {
    const groups = selectPermissionGroups(fixture, ["ADMIN"]);
    expect(groups.map((g) => g.menuCode)).toEqual(["users", "roles"]);
  });

  it("falls back to a derived label when none is provided", () => {
    const groups = selectPermissionGroups(fixture, ["ADMIN"]);
    const users = groups.find((g) => g.menuCode === "users")!;
    expect(users.items.find((i) => i.code === "users.VIEW")!.label).toBe("View Users");
    expect(users.items.find((i) => i.code === "users.CREATE")!.label).toBe("Users Create");
  });
});

describe("resolveEffectivePermissions", () => {
  it("ADMIN gets every code in contract scope", () => {
    const perms = resolveEffectivePermissions({ manifest: fixture, contracts: ["ADMIN"], authorizingType: "ADMIN" });
    expect(perms.sort()).toEqual(["roles.VIEW", "users.CREATE", "users.VIEW"]);
  });

  it("NORMAL keeps only granted codes within contract scope", () => {
    const perms = resolveEffectivePermissions({
      manifest: fixture,
      contracts: ["ADMIN"],
      authorizingType: "NORMAL",
      grantedRoleCodes: ["users.VIEW", "sales.VIEW", "ghost"],
    });
    expect(perms).toEqual(["users.VIEW"]);
  });

  it("NORMAL with wider contracts admits codes from those contracts", () => {
    const perms = resolveEffectivePermissions({
      manifest: fixture,
      contracts: ["ADMIN", "ISO"],
      authorizingType: "NORMAL",
      grantedRoleCodes: ["sales.VIEW", "users.VIEW"],
    });
    expect(perms).toEqual(["sales.VIEW", "users.VIEW"]);
  });
});

describe("selectVisibleMenuTree", () => {
  it("shows a leaf and its ancestors when a permission is granted, pruning empty groups", () => {
    const tree = selectVisibleMenuTree(fixture, ["ADMIN", "ISO"], ["users.VIEW"]);
    expect(tree.map((n) => n.menuCode)).toEqual(["system"]);
    expect(tree[0].children.map((n) => n.menuCode)).toEqual(["users"]);
  });

  it("hides leaves whose permission is not granted", () => {
    const tree = selectVisibleMenuTree(fixture, ["ISO"], ["sales.VIEW"]);
    expect(tree.map((n) => n.menuCode)).toEqual(["reports"]);
    expect(tree[0].children.map((n) => n.menuCode)).toEqual(["sales"]);
  });

  it("includes ancestor groups even if their own contract would not match the filter", () => {
    const manifest: AppManifest = {
      appId: "web",
      contractKeys: ["ADMIN", "ISO"],
      menus: [
        { menuCode: "grp", menuTitle: "Group", parentMenuCode: null, path: null, contractTypes: ["ADMIN"], order: 1 },
        { menuCode: "leaf", menuTitle: "Leaf", parentMenuCode: "grp", path: "/leaf", contractTypes: ["ISO"], order: 2, permissions: [{ code: "leaf.VIEW" }] },
      ],
    };
    const tree = selectVisibleMenuTree(manifest, ["ISO"], ["leaf.VIEW"]);
    expect(tree.map((n) => n.menuCode)).toEqual(["grp"]);
    expect(tree[0].children.map((n) => n.menuCode)).toEqual(["leaf"]);
  });
});
