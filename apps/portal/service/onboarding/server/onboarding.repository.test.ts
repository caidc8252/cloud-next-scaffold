import { beforeEach, describe, expect, it, vi } from "vitest";

const { tx, prisma } = vi.hoisted(() => {
  const tx = {
    sysOperatorInvite: { updateMany: vi.fn() },
    sysUser: { create: vi.fn() },
    sysParty: { findUnique: vi.fn(), update: vi.fn() },
    sysPartyUser: { findUnique: vi.fn(), create: vi.fn() },
  };
  return { tx, prisma: { $transaction: vi.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)) } };
});
vi.mock("@cloud/db", () => ({ prisma }));

import { bindInvite } from "./onboarding.repository";

beforeEach(() => {
  vi.clearAllMocks();
  tx.sysOperatorInvite.updateMany.mockResolvedValue({ count: 1 });
  tx.sysPartyUser.findUnique.mockResolvedValue(null); // 尚非成员
});

describe("bindInvite（场景一）", () => {
  it("既有用户接受：成员恒 NORMAL、绝不读写 party", async () => {
    await bindInvite({
      inviteId: 7, partyId: 42, userId: 5,
      roles: [{ roleId: 150 }], inviterUserId: 1, inviterName: "admin", now: new Date(),
    });
    expect(tx.sysPartyUser.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ authorizingType: "NORMAL" }) }),
    );
    expect(tx.sysParty.findUnique).not.toHaveBeenCalled();
    expect(tx.sysParty.update).not.toHaveBeenCalled();
  });

  it("已是成员则幂等：不重复建归属、不激活", async () => {
    tx.sysPartyUser.findUnique.mockResolvedValue({ partyUserId: 99 });
    const r = await bindInvite({
      inviteId: 7, partyId: 42, userId: 5,
      roles: [{ roleId: 150 }], inviterUserId: 1, inviterName: "admin", now: new Date(),
    });
    expect(r.alreadyMember).toBe(true);
    expect(tx.sysPartyUser.create).not.toHaveBeenCalled();
    expect(tx.sysParty.update).not.toHaveBeenCalled();
  });
});
