import { describe, expect, it } from "vitest";
import type { MenuEntry } from "@cloud/platform-config";
import { selectPermissionGroups, selectVisibleMenuTree } from "@/manifest/select";

// 这些 select 函数不再做契约过滤，入参是「已按契约过滤好的」菜单（生产里由 getMenus 提供）。
// 测试里用 scoped() 模拟 getMenus 的过滤，再把结果喂给 select 函数。
const fixture: MenuEntry[] = [
  { menuCode: "system", menuTitle: "System", parentMenuCode: null, path: null, icon: "settings", contractTypes: ["*"], order: 100 },
  { menuCode: "users", menuTitle: "Users", parentMenuCode: "system", path: "/system/users", contractTypes: ["*"], order: 101, permissions: [{ code: "users.view", label: "View Users" }, { code: "users.create" }] },
  { menuCode: "roles", menuTitle: "Roles", parentMenuCode: "system", path: "/system/roles", contractTypes: ["ADMIN"], order: 102, permissions: [{ code: "roles.view" }] },
  { menuCode: "reports", menuTitle: "Reports", parentMenuCode: null, path: null, contractTypes: ["ISO"], order: 200 },
  { menuCode: "sales", menuTitle: "Sales", parentMenuCode: "reports", path: "/reports/sales", contractTypes: ["ISO"], order: 201, permissions: [{ code: "sales.view" }] },
];

const scoped = (contracts: string[]): MenuEntry[] =>
  fixture.filter((m) => m.contractTypes.includes("*") || m.contractTypes.some((c) => contracts.includes(c)));

describe("selectPermissionGroups", () => {
  it("groups by menu and only includes menus that have permissions", () => {
    const groups = selectPermissionGroups(scoped(["ADMIN"]));
    expect(groups.map((g) => g.menuCode)).toEqual(["users", "roles"]);
  });

  it("passes label/desc through verbatim and falls back to the code when label is absent", () => {
    const groups = selectPermissionGroups(scoped(["ADMIN"]));
    const users = groups.find((g) => g.menuCode === "users")!;
    // label 原样透传（i18n key），无 label 时回落到 code，不再 humanize。
    expect(users.items.find((i) => i.code === "users.view")!.label).toBe("View Users");
    expect(users.items.find((i) => i.code === "users.create")!.label).toBe("users.create");
  });

  it("threads require through (null when absent)", () => {
    const groups = selectPermissionGroups([
      {
        menuCode: "m", menuTitle: "menu.m", parentMenuCode: null, path: "/m", contractTypes: ["ADMIN"], order: 1,
        permissions: [
          { code: "m.view", label: "permission.mView", desc: "permission.mViewDesc", require: null },
          { code: "m.add", label: "permission.mAdd", desc: "permission.mAddDesc", require: "m.view" },
        ],
      },
    ]);
    expect(groups[0].items).toEqual([
      { code: "m.view", label: "permission.mView", desc: "permission.mViewDesc", require: null },
      { code: "m.add", label: "permission.mAdd", desc: "permission.mAddDesc", require: "m.view" },
    ]);
  });
});

describe("selectVisibleMenuTree", () => {
  it("shows a leaf and its ancestors when a permission is granted, pruning empty groups", () => {
    const tree = selectVisibleMenuTree(scoped(["ADMIN", "ISO"]), ["users.view"]);
    expect(tree.map((n) => n.menuCode)).toEqual(["system"]);
    expect(tree[0].children.map((n) => n.menuCode)).toEqual(["users"]);
  });

  it("hides leaves whose permission is not granted", () => {
    const tree = selectVisibleMenuTree(scoped(["ISO"]), ["sales.view"]);
    expect(tree.map((n) => n.menuCode)).toEqual(["reports"]);
    expect(tree[0].children.map((n) => n.menuCode)).toEqual(["sales"]);
  });

  it("includes ancestor directories present in the scoped menus and prunes groups with no visible leaf", () => {
    const menus: MenuEntry[] = [
      { menuCode: "g1", menuTitle: "G1", parentMenuCode: null, path: null, contractTypes: ["*"], order: 1 },
      { menuCode: "a", menuTitle: "A", parentMenuCode: "g1", path: "/a", contractTypes: ["*"], order: 2, permissions: [{ code: "a.view" }] },
      { menuCode: "g2", menuTitle: "G2", parentMenuCode: null, path: null, contractTypes: ["*"], order: 3 },
      { menuCode: "b", menuTitle: "B", parentMenuCode: "g2", path: "/b", contractTypes: ["*"], order: 4, permissions: [{ code: "b.view" }] },
    ];
    const tree = selectVisibleMenuTree(menus, ["a.view"]);
    expect(tree.map((n) => n.menuCode)).toEqual(["g1"]); // g2 pruned: b not granted
    expect(tree[0].children.map((n) => n.menuCode)).toEqual(["a"]);
  });
});
