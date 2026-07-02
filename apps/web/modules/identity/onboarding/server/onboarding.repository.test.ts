import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERR_OB_ALREADY_MEMBER } from "@/modules/identity/onboarding/error/onboarding.error-codes";

const { tx, prisma } = vi.hoisted(() => {
  const tx = {
    sysOperatorInvite: { updateMany: vi.fn() },
    sysUser: { create: vi.fn() },
    sysParty: { findUnique: vi.fn(), update: vi.fn() },
    sysPartyUser: { findUnique: vi.fn(), create: vi.fn() },
  };
  return {
    tx,
    prisma: {
      $transaction: vi.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
      sysPartyUser: { findUnique: vi.fn() },
    },
  };
});
vi.mock("@cloud/db", () => ({ prisma }));

import { bindInvite } from "./onboarding.repository";

const baseParams = {
  inviteId: 7,
  partyId: 42,
  userId: 5,
  roles: [{ roleId: 150 }],
  inviterUserId: 1,
  inviterName: "admin",
  now: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  tx.sysOperatorInvite.updateMany.mockResolvedValue({ count: 1 });
  tx.sysPartyUser.findUnique.mockResolvedValue(null);
  prisma.sysPartyUser.findUnique.mockResolvedValue(null);
});

describe("bindInvite（场景一）", () => {
  it("既有用户接受：成员恒 NORMAL、绝不读写 party", async () => {
    await bindInvite(baseParams);
    expect(tx.sysPartyUser.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ authorizingType: "NORMAL" }) }),
    );
    expect(tx.sysParty.findUnique).not.toHaveBeenCalled();
    expect(tx.sysParty.update).not.toHaveBeenCalled();
  });

  it("事务前预检命中已是成员：抛 ALREADY_MEMBER、不开事务（不消费邀请）", async () => {
    prisma.sysPartyUser.findUnique.mockResolvedValue({ partyUserId: 99 });
    await expect(bindInvite(baseParams)).rejects.toMatchObject({ code: ERR_OB_ALREADY_MEMBER });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.sysOperatorInvite.updateMany).not.toHaveBeenCalled();
  });

  it("并发兜底（预检漏过、事务内命中）：抛 ALREADY_MEMBER、不重复建归属", async () => {
    tx.sysPartyUser.findUnique.mockResolvedValue({ partyUserId: 99 });
    await expect(bindInvite(baseParams)).rejects.toMatchObject({ code: ERR_OB_ALREADY_MEMBER });
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(tx.sysPartyUser.create).not.toHaveBeenCalled();
  });
});
