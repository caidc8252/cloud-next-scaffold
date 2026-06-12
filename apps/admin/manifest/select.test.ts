import { describe, expect, it } from "vitest";
import type { MenuEntry } from "@cloud/platform-config";
import { selectPermissionGroups, selectVisibleMenuTree } from "@/manifest/select";

// 这些 select 函数不再做契约过滤，入参是「已按契约过滤好的」菜单（生产里由 getMenus 提供）。
// 测试里用 scoped() 模拟 getMenus 的过滤，再把结果喂给 select 函数。
const fixture: MenuEntry[] = [
  { menuCode: "system", menuTitle: "System", parentMenuCode: null, path: null, icon: "settings", contractTypes: ["*"], order: 100 },
  { menuCode: "users", menuTitle: "Users", parentMenuCode: "system", path: "/system/users", contractTypes: ["*"], order: 101, permissions: [{ code: "users.VIEW", label: "View Users" }, { code: "users.CREATE" }] },
  { menuCode: "roles", menuTitle: "Roles", parentMenuCode: "system", path: "/system/roles", contractTypes: ["ADMIN"], order: 102, permissions: [{ code: "roles.VIEW" }] },
  { menuCode: "reports", menuTitle: "Reports", parentMenuCode: null, path: null, contractTypes: ["ISO"], order: 200 },
  { menuCode: "sales", menuTitle: "Sales", parentMenuCode: "reports", path: "/reports/sales", contractTypes: ["ISO"], order: 201, permissions: [{ code: "sales.VIEW" }] },
];

const scoped = (contracts: string[]): MenuEntry[] =>
  fixture.filter((m) => m.contractTypes.includes("*") || m.contractTypes.some((c) => contracts.includes(c)));

describe("selectPermissionGroups", () => {
  it("groups by menu and only includes menus that have permissions", () => {
    const groups = selectPermissionGroups(scoped(["ADMIN"]));
    expect(groups.map((g) => g.menuCode)).toEqual(["users", "roles"]);
  });

  it("falls back to a derived label when none is provided", () => {
    const groups = selectPermissionGroups(scoped(["ADMIN"]));
    const users = groups.find((g) => g.menuCode === "users")!;
    expect(users.items.find((i) => i.code === "users.VIEW")!.label).toBe("View Users");
    expect(users.items.find((i) => i.code === "users.CREATE")!.label).toBe("Users Create");
  });
});

describe("selectVisibleMenuTree", () => {
  it("shows a leaf and its ancestors when a permission is granted, pruning empty groups", () => {
    const tree = selectVisibleMenuTree(scoped(["ADMIN", "ISO"]), ["users.VIEW"]);
    expect(tree.map((n) => n.menuCode)).toEqual(["system"]);
    expect(tree[0].children.map((n) => n.menuCode)).toEqual(["users"]);
  });

  it("hides leaves whose permission is not granted", () => {
    const tree = selectVisibleMenuTree(scoped(["ISO"]), ["sales.VIEW"]);
    expect(tree.map((n) => n.menuCode)).toEqual(["reports"]);
    expect(tree[0].children.map((n) => n.menuCode)).toEqual(["sales"]);
  });

  it("includes ancestor directories present in the scoped menus and prunes groups with no visible leaf", () => {
    const menus: MenuEntry[] = [
      { menuCode: "g1", menuTitle: "G1", parentMenuCode: null, path: null, contractTypes: ["*"], order: 1 },
      { menuCode: "a", menuTitle: "A", parentMenuCode: "g1", path: "/a", contractTypes: ["*"], order: 2, permissions: [{ code: "a.VIEW" }] },
      { menuCode: "g2", menuTitle: "G2", parentMenuCode: null, path: null, contractTypes: ["*"], order: 3 },
      { menuCode: "b", menuTitle: "B", parentMenuCode: "g2", path: "/b", contractTypes: ["*"], order: 4, permissions: [{ code: "b.VIEW" }] },
    ];
    const tree = selectVisibleMenuTree(menus, ["a.VIEW"]);
    expect(tree.map((n) => n.menuCode)).toEqual(["g1"]); // g2 pruned: b not granted
    expect(tree[0].children.map((n) => n.menuCode)).toEqual(["a"]);
  });
});
