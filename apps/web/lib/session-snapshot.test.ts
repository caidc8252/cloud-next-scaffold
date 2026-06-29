import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@cloud/db", () => ({
  prisma: {
    sysUser: { findUnique: vi.fn() },
    sysPartyUser: { findMany: vi.fn() },
    sysPartyContract: { findMany: vi.fn() },
    sysRole: { findMany: vi.fn() },
  },
}));
// 新模型：会话权限按 roleId 解析（预置管理员注入 party scope，其余取自身码），最终 ∩ scope。
// scope 由 resolvePartyScope 提供（单一来源），不再经 getMenus + resolveEffectivePermissions。
vi.mock("@/manifest", () => ({
  getRoles: vi.fn(() => []),
  resolveRolePermissions: vi.fn(() => undefined),
  resolvePartyScope: vi.fn(() => new Set<string>()),
}));

import { prisma } from "@cloud/db";
import { getRoles, resolvePartyScope, resolveRolePermissions } from "@/manifest";
import { buildSessionSnapshot } from "./session-snapshot";

const NOW = new Date("2026-06-08T12:00:00.000Z");
const ACTIVE_USER = { userId: 1, username: "alice", nickName: "Alice", email: "a@x.io", status: "ACTIVE" };

function partyUser(over: Record<string, unknown> = {}) {
  return {
    partyId: 100,
    status: "ACTIVE",
    authorizingType: "NORMAL",
    authorizingFrom: null,
    authorizingTo: null,
    roles: [{ roleId: 7 }],
    partner: { partyId: 100, partyName: "Acme", status: "ACTIVE", timezone: "UTC" },
    ...over,
  };
}

const VALID_CONTRACT = {
  authorizedPartyId: 100,
  authorizedContractType: "ISO",
  effectiveFromDate: new Date("2026-06-01T00:00:00Z"),
  effectiveToDate: new Date("2026-06-30T00:00:00Z"),
};

function dbRole(over: Record<string, unknown> = {}) {
  return {
    roleId: 1001,
    roleName: "Ops",
    roleType: "PRIVATE",
    partyId: 100,
    startDate: new Date("2026-06-01T00:00:00Z"),
    endDate: new Date("2026-12-31T00:00:00Z"),
    permissionCodes: ["users.view"],
    ...over,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getRoles).mockReturnValue([]);
  vi.mocked(resolveRolePermissions).mockReturnValue(undefined);
  vi.mocked(resolvePartyScope).mockReturnValue(new Set());
});

describe("buildSessionSnapshot", () => {
  it("returns null for an inactive user", async () => {
    vi.mocked(prisma.sysUser.findUnique).mockResolvedValue({ ...ACTIVE_USER, status: "LOCKED" } as never);
    expect(await buildSessionSnapshot(1, 100, NOW)).toBeNull();
  });

  it("builds current context for a partner with a valid contract", async () => {
    vi.mocked(prisma.sysUser.findUnique).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(prisma.sysPartyUser.findMany).mockResolvedValue([partyUser()] as never);
    vi.mocked(prisma.sysPartyContract.findMany).mockResolvedValue([VALID_CONTRACT] as never);

    const snap = await buildSessionSnapshot(1, 100, NOW);

    expect(snap?.currentPartyId).toBe(100);
    expect(snap?.contractTypes).toEqual(["ISO"]);
    expect(snap?.partners.map((p) => p.partyId)).toEqual([100]);
  });

  it("drops the current context when the only contract is expired", async () => {
    vi.mocked(prisma.sysUser.findUnique).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(prisma.sysPartyUser.findMany).mockResolvedValue([partyUser()] as never);
    vi.mocked(prisma.sysPartyContract.findMany).mockResolvedValue([
      { ...VALID_CONTRACT, effectiveToDate: new Date("2026-06-07T00:00:00Z") },
    ] as never);

    const snap = await buildSessionSnapshot(1, 100, NOW);

    expect(snap?.currentPartyId).toBeNull();
    expect(snap?.partners).toEqual([]);
  });

  it("drops the current context when the authorizing window is closed", async () => {
    vi.mocked(prisma.sysUser.findUnique).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(prisma.sysPartyUser.findMany).mockResolvedValue([
      partyUser({ authorizingTo: new Date("2026-06-07T00:00:00Z") }),
    ] as never);
    vi.mocked(prisma.sysPartyContract.findMany).mockResolvedValue([VALID_CONTRACT] as never);

    const snap = await buildSessionSnapshot(1, 100, NOW);

    expect(snap?.currentPartyId).toBeNull();
    expect(snap?.partners.map((p) => p.partyId)).toEqual([100]);
  });

  it("maps the authorizing window onto the partner ref", async () => {
    vi.mocked(prisma.sysUser.findUnique).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(prisma.sysPartyUser.findMany).mockResolvedValue([
      partyUser({
        authorizingFrom: new Date("2026-06-01T00:00:00Z"),
        authorizingTo: new Date("2026-12-31T00:00:00Z"),
      }),
    ] as never);
    vi.mocked(prisma.sysPartyContract.findMany).mockResolvedValue([VALID_CONTRACT] as never);

    const snap = await buildSessionSnapshot(1, 100, NOW);

    expect(snap?.partners[0].authorizingFrom).toBe("2026-06-01T00:00:00.000Z");
    expect(snap?.partners[0].authorizingTo).toBe("2026-12-31T00:00:00.000Z");
  });

  // —— 权限推导（NORMAL 走 roleId ∩ scope;ADMIN 走 §7 结构旁路直取 scope）——

  it("resolves a preset admin role uniformly (filled group perms ∩ scope; no special-case)", async () => {
    vi.mocked(prisma.sysUser.findUnique).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(prisma.sysPartyUser.findMany).mockResolvedValue([
      partyUser({ roles: [{ roleId: 1 }], authorizingType: "NORMAL" }),
    ] as never);
    vi.mocked(prisma.sysPartyContract.findMany).mockResolvedValue([VALID_CONTRACT] as never);
    vi.mocked(getRoles).mockReturnValue([
      { roleId: 1, roleName: "Administrator", permissionCodes: [] },
    ] as never);
    // roleId 1（预置超管）显式列码；这里模拟 resolveRolePermissions 返回其码（含一个组外码 out.OF_SCOPE）。
    vi.mocked(resolveRolePermissions).mockReturnValue(["users.view", "roles.view", "out.OF_SCOPE"]);
    vi.mocked(resolvePartyScope).mockReturnValue(new Set(["users.view", "roles.view"]));

    const snap = await buildSessionSnapshot(1, 100, NOW);

    // 组权限 ∩ party scope：out.OF_SCOPE 被砍。
    expect(snap?.permissions.slice().sort()).toEqual(["roles.view", "users.view"]);
  });

  it("grants a non-preset code role its own permission codes intersected with scope", async () => {
    vi.mocked(prisma.sysUser.findUnique).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(prisma.sysPartyUser.findMany).mockResolvedValue([
      partyUser({ roles: [{ roleId: 2 }], authorizingType: "NORMAL" }),
    ] as never);
    vi.mocked(prisma.sysPartyContract.findMany).mockResolvedValue([VALID_CONTRACT] as never);
    vi.mocked(getRoles).mockReturnValue([
      { roleId: 2, roleName: "Operator", permissionCodes: ["roles.view"] },
    ] as never);
    vi.mocked(resolveRolePermissions).mockReturnValue(["roles.view", "ghost.x"]);
    vi.mocked(resolvePartyScope).mockReturnValue(new Set(["roles.view", "users.view"]));

    const snap = await buildSessionSnapshot(1, 100, NOW);

    // 非预置编码角色取 resolveRolePermissions ∩ scope：roles.view 在 scope，ghost.x 不在。
    expect(snap?.permissions).toEqual(["roles.view"]);
  });

  it("grants a normal DB role only its own codes intersected with scope", async () => {
    vi.mocked(prisma.sysUser.findUnique).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(prisma.sysPartyUser.findMany).mockResolvedValue([
      partyUser({ roles: [{ roleId: 1001 }], authorizingType: "NORMAL" }),
    ] as never);
    vi.mocked(prisma.sysPartyContract.findMany).mockResolvedValue([VALID_CONTRACT] as never);
    vi.mocked(prisma.sysRole.findMany).mockResolvedValue([
      dbRole({ permissionCodes: ["users.view", "ghost.x"] }),
    ] as never);
    vi.mocked(resolvePartyScope).mockReturnValue(new Set(["users.view", "roles.view"]));

    const snap = await buildSessionSnapshot(1, 100, NOW);

    // ghost.x 不在 scope 被砍；roles.view 未被该角色授予。
    expect(snap?.permissions).toEqual(["users.view"]);
  });

  it("grants an authorizingType=ADMIN user the full party scope regardless of assigned role (§7 bypass)", async () => {
    vi.mocked(prisma.sysUser.findUnique).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(prisma.sysPartyUser.findMany).mockResolvedValue([
      partyUser({ roles: [{ roleId: 1001 }], authorizingType: "ADMIN" }),
    ] as never);
    vi.mocked(prisma.sysPartyContract.findMany).mockResolvedValue([VALID_CONTRACT] as never);
    vi.mocked(prisma.sysRole.findMany).mockResolvedValue([
      dbRole({ permissionCodes: ["users.view"] }),
    ] as never);
    vi.mocked(resolvePartyScope).mockReturnValue(new Set(["users.view", "roles.view"]));

    const snap = await buildSessionSnapshot(1, 100, NOW);

    // ★ ADMIN 结构旁路:无视所分角色(只 users.view)直取合同内全部权限(仍 ⊆ scope)。
    expect(snap?.permissions.slice().sort()).toEqual(["roles.view", "users.view"]);
  });

  it("a NORMAL user with the same limited role gets only role ∩ scope (contrast to ADMIN bypass)", async () => {
    vi.mocked(prisma.sysUser.findUnique).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(prisma.sysPartyUser.findMany).mockResolvedValue([
      partyUser({ roles: [{ roleId: 1001 }], authorizingType: "NORMAL" }),
    ] as never);
    vi.mocked(prisma.sysPartyContract.findMany).mockResolvedValue([VALID_CONTRACT] as never);
    vi.mocked(prisma.sysRole.findMany).mockResolvedValue([
      dbRole({ permissionCodes: ["users.view"] }),
    ] as never);
    vi.mocked(resolvePartyScope).mockReturnValue(new Set(["users.view", "roles.view"]));

    const snap = await buildSessionSnapshot(1, 100, NOW);

    // NORMAL 不旁路:只拿角色自身码 ∩ scope。
    expect(snap?.permissions).toEqual(["users.view"]);
  });
});
