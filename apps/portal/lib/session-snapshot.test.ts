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
  authorizedContractType: "US-ISO",
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
    permissionCodes: ["overview.view"],
    ...over,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getRoles).mockReturnValue([]);
  vi.mocked(resolveRolePermissions).mockReturnValue(undefined);
  vi.mocked(resolvePartyScope).mockReturnValue(new Set());
});

describe("buildSessionSnapshot (portal)", () => {
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
    expect(snap?.contractTypes).toEqual(["US-ISO"]);
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

  // —— 权限推导（roleId 驱动，去 ADMIN 分支）——

  it("resolves the customer preset admin role (101) uniformly (filled group perms ∩ scope)", async () => {
    vi.mocked(prisma.sysUser.findUnique).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(prisma.sysPartyUser.findMany).mockResolvedValue([
      partyUser({ roles: [{ roleId: 101 }], authorizingType: "NORMAL" }),
    ] as never);
    vi.mocked(prisma.sysPartyContract.findMany).mockResolvedValue([VALID_CONTRACT] as never);
    vi.mocked(getRoles).mockReturnValue([
      { roleId: 101, roleName: "Customer Administrator", permissionCodes: [] },
    ] as never);
    vi.mocked(resolveRolePermissions).mockReturnValue(["overview.view", "report.view", "out.OF_SCOPE"]);
    vi.mocked(resolvePartyScope).mockReturnValue(new Set(["overview.view", "report.view"]));

    const snap = await buildSessionSnapshot(1, 100, NOW);

    expect(snap?.permissions.slice().sort()).toEqual(["overview.view", "report.view"]);
  });

  it("grants a non-preset code role its own permission codes intersected with scope", async () => {
    vi.mocked(prisma.sysUser.findUnique).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(prisma.sysPartyUser.findMany).mockResolvedValue([
      partyUser({ roles: [{ roleId: 2 }], authorizingType: "NORMAL" }),
    ] as never);
    vi.mocked(prisma.sysPartyContract.findMany).mockResolvedValue([VALID_CONTRACT] as never);
    vi.mocked(getRoles).mockReturnValue([
      { roleId: 2, roleName: "Operator", permissionCodes: ["overview.view"] },
    ] as never);
    vi.mocked(resolveRolePermissions).mockReturnValue(["overview.view", "ghost.x"]);
    vi.mocked(resolvePartyScope).mockReturnValue(new Set(["overview.view", "report.view"]));

    const snap = await buildSessionSnapshot(1, 100, NOW);

    expect(snap?.permissions).toEqual(["overview.view"]);
  });

  it("grants a normal DB role only its own codes intersected with scope", async () => {
    vi.mocked(prisma.sysUser.findUnique).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(prisma.sysPartyUser.findMany).mockResolvedValue([
      partyUser({ roles: [{ roleId: 1001 }], authorizingType: "NORMAL" }),
    ] as never);
    vi.mocked(prisma.sysPartyContract.findMany).mockResolvedValue([VALID_CONTRACT] as never);
    vi.mocked(prisma.sysRole.findMany).mockResolvedValue([
      dbRole({ permissionCodes: ["overview.view", "ghost.x"] }),
    ] as never);
    vi.mocked(resolvePartyScope).mockReturnValue(new Set(["overview.view", "report.view"]));

    const snap = await buildSessionSnapshot(1, 100, NOW);

    expect(snap?.permissions).toEqual(["overview.view"]);
  });

  it("no longer grants all scope to an authorizingType=ADMIN user without a preset role", async () => {
    vi.mocked(prisma.sysUser.findUnique).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(prisma.sysPartyUser.findMany).mockResolvedValue([
      partyUser({ roles: [{ roleId: 1001 }], authorizingType: "ADMIN" }),
    ] as never);
    vi.mocked(prisma.sysPartyContract.findMany).mockResolvedValue([VALID_CONTRACT] as never);
    vi.mocked(prisma.sysRole.findMany).mockResolvedValue([
      dbRole({ permissionCodes: ["overview.view"] }),
    ] as never);
    vi.mocked(resolvePartyScope).mockReturnValue(new Set(["overview.view", "report.view"]));

    const snap = await buildSessionSnapshot(1, 100, NOW);

    expect(snap?.permissions).toEqual(["overview.view"]);
  });
});
