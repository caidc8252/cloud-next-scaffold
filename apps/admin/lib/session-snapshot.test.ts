import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@cloud/db", () => ({
  prisma: {
    sysUser: { findUnique: vi.fn() },
    sysPartnerUser: { findMany: vi.fn() },
    sysPartnerContract: { findMany: vi.fn() },
    sysRole: { findMany: vi.fn() },
    sysPartnerRoleBlocklist: { findMany: vi.fn() },
  },
}));
vi.mock("@/manifest", () => ({ getMenus: vi.fn(() => []) }));
vi.mock("@/manifest/select", () => ({
  resolveEffectivePermissions: vi.fn(() => ["users.VIEW"]),
}));

import { prisma } from "@cloud/db";
import { resolveEffectivePermissions } from "@/manifest/select";
import { buildSessionSnapshot } from "./session-snapshot";

const NOW = new Date("2026-06-08T12:00:00.000Z");
const ACTIVE_USER = { userId: 1, username: "alice", nickName: "Alice", email: "a@x.io", status: "ACTIVE" };

function partnerUser(over: Record<string, unknown> = {}) {
  return {
    partnerId: 100,
    status: "ACTIVE",
    authorizingType: "NORMAL",
    authorizingFrom: null,
    authorizingTo: null,
    roles: [{ roleId: 7 }],
    partner: { partnerId: 100, partnerName: "Acme", status: "ACTIVE", timezone: "UTC" },
    ...over,
  };
}

const VALID_CONTRACT = {
  authorizedPartnerId: 100,
  authorizedContractType: "ISO",
  effectiveFromDate: new Date("2026-06-01T00:00:00Z"),
  effectiveToDate: new Date("2026-06-30T00:00:00Z"),
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(resolveEffectivePermissions).mockReturnValue(["users.VIEW"]);
  vi.mocked(prisma.sysRole.findMany).mockResolvedValue([
    { roleId: 7, roleName: "Ops", roleType: "PUBLIC", contractType: "ISO", partnerId: null, permissionCodes: ["users.VIEW"] },
  ] as never);
  vi.mocked(prisma.sysPartnerRoleBlocklist.findMany).mockResolvedValue([] as never);
});

describe("buildSessionSnapshot", () => {
  it("returns null for an inactive user", async () => {
    vi.mocked(prisma.sysUser.findUnique).mockResolvedValue({ ...ACTIVE_USER, status: "LOCKED" } as never);
    expect(await buildSessionSnapshot(1, 100, NOW)).toBeNull();
  });

  it("builds current context for a partner with a valid contract", async () => {
    vi.mocked(prisma.sysUser.findUnique).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(prisma.sysPartnerUser.findMany).mockResolvedValue([partnerUser()] as never);
    vi.mocked(prisma.sysPartnerContract.findMany).mockResolvedValue([VALID_CONTRACT] as never);

    const snap = await buildSessionSnapshot(1, 100, NOW);

    expect(snap?.currentPartnerId).toBe(100);
    expect(snap?.contractTypes).toEqual(["ISO"]);
    expect(snap?.permissions).toEqual(["users.VIEW"]);
    expect(snap?.partners.map((p) => p.partnerId)).toEqual([100]);
  });

  it("drops the current context when the only contract is expired", async () => {
    vi.mocked(prisma.sysUser.findUnique).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(prisma.sysPartnerUser.findMany).mockResolvedValue([partnerUser()] as never);
    vi.mocked(prisma.sysPartnerContract.findMany).mockResolvedValue([
      { ...VALID_CONTRACT, effectiveToDate: new Date("2026-06-07T00:00:00Z") },
    ] as never);

    const snap = await buildSessionSnapshot(1, 100, NOW);

    expect(snap?.currentPartnerId).toBeNull();
    expect(snap?.partners).toEqual([]); // 无有效合同 → 不在可选列表
  });

  it("drops the current context when the authorizing window is closed", async () => {
    vi.mocked(prisma.sysUser.findUnique).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(prisma.sysPartnerUser.findMany).mockResolvedValue([
      partnerUser({ authorizingTo: new Date("2026-06-07T00:00:00Z") }),
    ] as never);
    vi.mocked(prisma.sysPartnerContract.findMany).mockResolvedValue([VALID_CONTRACT] as never);

    const snap = await buildSessionSnapshot(1, 100, NOW);

    expect(snap?.currentPartnerId).toBeNull();
    // 合同有效 → 仍在可选列表（授权窗口不进 partners[] 口径）
    expect(snap?.partners.map((p) => p.partnerId)).toEqual([100]);
  });

  it("maps the authorizing window onto the partner ref (bug fix)", async () => {
    vi.mocked(prisma.sysUser.findUnique).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(prisma.sysPartnerUser.findMany).mockResolvedValue([
      partnerUser({
        authorizingFrom: new Date("2026-06-01T00:00:00Z"),
        authorizingTo: new Date("2026-12-31T00:00:00Z"),
      }),
    ] as never);
    vi.mocked(prisma.sysPartnerContract.findMany).mockResolvedValue([VALID_CONTRACT] as never);

    const snap = await buildSessionSnapshot(1, 100, NOW);

    expect(snap?.partners[0].authorizingFrom).toBe("2026-06-01T00:00:00.000Z");
    expect(snap?.partners[0].authorizingTo).toBe("2026-12-31T00:00:00.000Z");
  });
});
