import { describe, expect, it } from "vitest";
import { validateMenus, validateRoles } from "../src/index.ts";

describe("validateMenus", () => {
  it("passes for a well-formed menu pool", () => {
    expect(() =>
      validateMenus(
        [
          { menuCode: "system", menuTitle: "System", parentMenuCode: null, path: null, contractTypes: [] },
          { menuCode: "users", menuTitle: "Users", parentMenuCode: "system", path: "/system/users", contractTypes: ["ADMIN"], permissions: [{ code: "users.view" }] },
        ],
        { contractTypes: ["ADMIN", "ISO"] },
      ),
    ).not.toThrow();
  });

  it("rejects duplicate menuCode", () => {
    expect(() =>
      validateMenus([
        { menuCode: "a", menuTitle: "A", parentMenuCode: null, path: "/a", contractTypes: [] },
        { menuCode: "a", menuTitle: "A2", parentMenuCode: null, path: "/a2", contractTypes: [] },
      ]),
    ).toThrow(/duplicate menuCode "a"/);
  });

  it("rejects duplicate permissionCode (even across different menus)", () => {
    expect(() =>
      validateMenus([
        { menuCode: "a", menuTitle: "A", parentMenuCode: null, path: "/a", contractTypes: ["ADMIN"], permissions: [{ code: "x.view" }] },
        { menuCode: "b", menuTitle: "B", parentMenuCode: null, path: "/b", contractTypes: ["ADMIN"], permissions: [{ code: "x.view" }] },
      ]),
    ).toThrow(/duplicate permissionCode "x.view"/);
  });

  it("rejects a missing parent reference", () => {
    expect(() =>
      validateMenus([
        { menuCode: "child", menuTitle: "Child", parentMenuCode: "ghost", path: "/c", contractTypes: [] },
      ]),
    ).toThrow(/missing parent "ghost"/);
  });

  it("rejects a parent cycle", () => {
    expect(() =>
      validateMenus([
        { menuCode: "a", menuTitle: "A", parentMenuCode: "b", path: null, contractTypes: [] },
        { menuCode: "b", menuTitle: "B", parentMenuCode: "a", path: null, contractTypes: [] },
      ]),
    ).toThrow(/parent cycle/);
  });

  it("rejects an unknown contract type when a list is provided", () => {
    expect(() =>
      validateMenus(
        [{ menuCode: "a", menuTitle: "A", parentMenuCode: null, path: "/a", contractTypes: ["NOPE"] }],
        { contractTypes: ["ADMIN"] },
      ),
    ).toThrow(/unknown contractType "NOPE"/);
  });

  it("rejects a group (no path) with no children", () => {
    expect(() =>
      validateMenus([
        { menuCode: "empty", menuTitle: "Empty", parentMenuCode: null, path: null, contractTypes: [] },
      ]),
    ).toThrow(/group menu "empty" \(no path\) has no children/);
  });

  it("rejects an unknown icon when a resolver is provided", () => {
    expect(() =>
      validateMenus(
        [{ menuCode: "a", menuTitle: "A", parentMenuCode: null, path: "/a", icon: "made-up", contractTypes: [] }],
        { resolveIcon: (name) => name === "users" },
      ),
    ).toThrow(/unknown icon "made-up"/);
  });

  it("rejects a literal \"*\" contract type (no wildcard support; use [] for universal)", () => {
    expect(() =>
      validateMenus(
        [{ menuCode: "a", menuTitle: "A", parentMenuCode: null, path: "/a", contractTypes: ["*"] }],
        { contractTypes: ["ADMIN"] },
      ),
    ).toThrow(/unknown contractType "\*"/);
  });

  it("allows permissions on a universal ([]) menu (universal codes enter every party's scope by design)", () => {
    expect(() =>
      validateMenus([
        {
          menuCode: "a",
          menuTitle: "A",
          parentMenuCode: null,
          path: "/a",
          contractTypes: [],
          permissions: [{ code: "a.view" }],
        },
      ]),
    ).not.toThrow();
  });
});

describe("validateMenus — permission code format", () => {
  it("rejects a code that is not lowercase camel <domain>.<action>", () => {
    expect(() =>
      validateMenus([
        { menuCode: "m", menuTitle: "menu.m", parentMenuCode: null, path: "/m", contractTypes: ["ADMIN"], permissions: [{ code: "overview:view", label: "permission.x" }] },
      ]),
    ).toThrow(/code .*bad format/i);
  });
});

describe("validateMenus — require", () => {
  const base = (perms: { code: string; require?: string | null }[]) => [
    {
      menuCode: "m",
      menuTitle: "menu.m",
      parentMenuCode: null,
      path: "/m",
      contractTypes: ["ADMIN"],
      permissions: perms.map((p) => ({ ...p, label: `permission.${p.code}` })),
    },
  ];

  it("passes a valid same-menu require chain", () => {
    expect(() =>
      validateMenus(
        base([
          { code: "m.view", require: null },
          { code: "m.add", require: "m.view" },
          { code: "m.edit", require: "m.add" },
        ]),
      ),
    ).not.toThrow();
  });

  it("rejects require pointing to a missing code", () => {
    expect(() => validateMenus(base([{ code: "m.add", require: "m.ghost" }]))).toThrow(
      /require .*m\.ghost.*not found/i,
    );
  });

  it("rejects require pointing across menus", () => {
    const menus = [
      ...base([{ code: "m.view", require: null }]),
      {
        menuCode: "n",
        menuTitle: "menu.n",
        parentMenuCode: null,
        path: "/n",
        contractTypes: ["ADMIN"],
        permissions: [{ code: "n.add", label: "permission.nAdd", require: "m.view" }],
      },
    ];
    expect(() => validateMenus(menus)).toThrow(/cross-menu/i);
  });

  it("rejects a require cycle", () => {
    expect(() =>
      validateMenus(
        base([
          { code: "m.a", require: "m.b" },
          { code: "m.b", require: "m.a" },
        ]),
      ),
    ).toThrow(/cycle/i);
  });
});

describe("validateRoles", () => {
  it("rejects a roleId outside the hardcoded 1–300 range (≥1001 is DB-only)", () => {
    expect(() =>
      validateRoles([{ roleId: 1001, roleName: "Dyn", remark: "Dyn", permissionCodes: [] }], { menuPermissionCodes: [] }),
    ).toThrow(/out of hardcoded range/);
  });

  it("rejects a role referencing an unknown permissionCode", () => {
    expect(() =>
      validateRoles([{ roleId: 2, roleName: "Ops", remark: "Ops", permissionCodes: ["ghost.x"] }], {
        menuPermissionCodes: ["users.view"],
      }),
    ).toThrow(/unknown permissionCode "ghost.x"/);
  });
});
