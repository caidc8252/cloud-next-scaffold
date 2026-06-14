import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ERR_USER_CANCEL_NOT_PENDING,
  ERR_USER_CANNOT_DISABLE_SELF,
  ERR_USER_EMAIL_TAKEN,
  ERR_USER_NO_PENDING_INVITE,
  ERR_USER_NOT_FOUND,
  ERR_USER_PROTECTED,
} from "@cloud/request/error-codes";
import type { ActiveSession } from "@cloud/permissions/server";

// 数据访问与 Redis token 是 I/O 边界,mock 掉;被测的是 service 的编排 / 分支 / 抛错行为
// ——这正是迁移前埋在 route 里、没法脱离 HTTP+DB 单测的业务逻辑。用工厂 mock 而非自动 mock:
// 自动 mock 会先 import 真模块以读取导出形状,从而触发 @cloud/db 实例化(需要 DATABASE_URL)。
vi.mock("./users.repository", () => ({
  listPartyUsers: vi.fn(),
  listPendingInvites: vi.fn(),
  resolveUsernames: vi.fn(),
  findUserLink: vi.fn(),
  findUserByEmail: vi.fn(),
  getUserWithLink: vi.fn(),
  updatePartyUser: vi.fn(),
  findPendingInviteByEmail: vi.fn(),
  findInvite: vi.fn(),
  findPendingInvite: vi.fn(),
  createInvite: vi.fn(),
  updateInvite: vi.fn(),
  deleteInvite: vi.fn(),
}));
vi.mock("@/lib/password-reset-token", () => ({ createPasswordResetToken: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendInviteEmail: vi.fn(), sendResetLinkEmail: vi.fn() }));

import * as repo from "./users.repository";
import { createPasswordResetToken } from "@/lib/password-reset-token";
import { sendInviteEmail, sendResetLinkEmail } from "@/lib/email";
import {
  cancelInvite,
  createInvite,
  listUsersAndInvites,
  regenerateInvite,
  resendInvite,
  resetUserPassword,
  setInviteRoles,
  toggleUserLock,
  updateUser,
} from "./users.service";

const session = {
  userId: 1,
  displayName: "admin",
  currentPartyId: 100,
  partyName: "Acme",
  permissions: ["users.UPD"],
} as unknown as ActiveSession;

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    userId: 2,
    username: "bob",
    nickName: "Bob",
    email: "bob@example.com",
    country: "US",
    status: "ACTIVE",
    lastLoginAt: null,
    passwordChangedTimestamp: null,
    passwordErrorTimes: 0,
    passwordErrorLockExpiredTimestamp: null,
    creTime: new Date("2026-01-01T00:00:00.000Z"),
    updTime: new Date("2026-01-02T00:00:00.000Z"),
    partyUsers: [{ authorizingType: "NORMAL", status: "ACTIVE", roles: [{ roleId: 5 }], remark: "" }],
    ...overrides,
  };
}

function inviteRow(overrides: Record<string, unknown> = {}) {
  return {
    operatorInviteId: 9,
    inviteEmail: "new@example.com",
    token: "tok",
    expiresAt: new Date(Date.now() + 7 * 86_400_000), // 未过期
    resendCount: 0,
    creTime: new Date("2026-01-10T00:00:00.000Z"),
    inviterUserId: 1,
    intendedRole: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(repo.findUserByEmail).mockResolvedValue(null as never);
});

describe("listUsersAndInvites", () => {
  it("returns mapped users followed by pending invites with resolved inviter names", async () => {
    vi.mocked(repo.listPartyUsers).mockResolvedValue([userRow()] as never);
    vi.mocked(repo.listPendingInvites).mockResolvedValue([inviteRow({ inviterUserId: 42 })] as never);
    vi.mocked(repo.resolveUsernames).mockResolvedValue(new Map([[42, "carol"]]));

    const result = await listUsersAndInvites(100);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("2");
    expect(result[1].id).toBe("invite-9");
    expect(result[1].invitedBy).toBe("carol");
  });
});

describe("createInvite", () => {
  it("rejects a duplicate pending invite for the same email", async () => {
    vi.mocked(repo.findPendingInviteByEmail).mockResolvedValue(inviteRow() as never);

    await expect(createInvite(session, { email: "new@example.com" })).rejects.toMatchObject({
      code: ERR_USER_EMAIL_TAKEN,
    });
    expect(repo.createInvite).not.toHaveBeenCalled();
  });

  it("creates the invite and stores the selected roles", async () => {
    vi.mocked(repo.findPendingInviteByEmail).mockResolvedValue(null as never);
    vi.mocked(repo.createInvite).mockResolvedValue(inviteRow({ intendedRole: [{ roleId: 3 }] }) as never);

    const invite = await createInvite(session, { email: "new@example.com", roleIds: ["3", "3"] });

    expect(invite.inviteEmail).toBe("new@example.com");
    expect(invite.invitedBy).toBe("admin");
    expect(vi.mocked(repo.createInvite).mock.calls[0][0]).toMatchObject({ intendedRole: [{ roleId: 3 }] });
    expect(sendInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "new@example.com", token: "tok", partyName: "Acme", inviterName: "admin" }),
    );
  });

  it("已是成员（ACTIVE）→ EMAIL_TAKEN，不发邀请", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue({ userId: 9 } as never);
    vi.mocked(repo.findUserLink).mockResolvedValue({ status: "ACTIVE", authorizingType: "NORMAL" } as never);
    await expect(createInvite(session, { email: "x@example.com" })).rejects.toMatchObject({ code: ERR_USER_EMAIL_TAKEN });
    expect(repo.createInvite).not.toHaveBeenCalled();
    expect(repo.updateInvite).not.toHaveBeenCalled();
  });

  it("已是成员（LOCKED）→ EMAIL_TAKEN", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue({ userId: 9 } as never);
    vi.mocked(repo.findUserLink).mockResolvedValue({ status: "LOCKED", authorizingType: "NORMAL" } as never);
    await expect(createInvite(session, { email: "x@example.com" })).rejects.toMatchObject({ code: ERR_USER_EMAIL_TAKEN });
  });

  it("同邮箱未过期邀请 → EMAIL_TAKEN", async () => {
    vi.mocked(repo.findPendingInviteByEmail).mockResolvedValue(inviteRow() as never); // 未过期
    await expect(createInvite(session, { email: "x@example.com" })).rejects.toMatchObject({ code: ERR_USER_EMAIL_TAKEN });
    expect(repo.createInvite).not.toHaveBeenCalled();
  });

  it("同邮箱已过期邀请 → 覆盖原行（不新建）", async () => {
    vi.mocked(repo.findPendingInviteByEmail).mockResolvedValue(
      inviteRow({ operatorInviteId: 7, expiresAt: new Date(Date.now() - 1000) }) as never,
    );
    vi.mocked(repo.updateInvite).mockResolvedValue(inviteRow({ operatorInviteId: 7 }) as never);
    await createInvite(session, { email: "x@example.com", roleIds: ["3"] });
    expect(repo.createInvite).not.toHaveBeenCalled();
    expect(vi.mocked(repo.updateInvite).mock.calls[0][0]).toBe(7);
    expect(vi.mocked(repo.updateInvite).mock.calls[0][1]).toMatchObject({ status: "PENDING", resendCount: 0 });
  });
});

describe("updateUser", () => {
  it("throws NOT_FOUND when the user has no link in this partner", async () => {
    vi.mocked(repo.findUserLink).mockResolvedValue(null as never);
    await expect(updateUser(session, 2, { remark: "x" })).rejects.toMatchObject({
      code: ERR_USER_NOT_FOUND,
      status: 404,
    });
  });

  it("forbids changing roles on a protected (ADMIN) user", async () => {
    vi.mocked(repo.findUserLink).mockResolvedValue({ authorizingType: "ADMIN", roles: [] } as never);
    await expect(updateUser(session, 2, { roleIds: ["3"] })).rejects.toMatchObject({
      code: ERR_USER_PROTECTED,
    });
  });

  it("rejects a role change without users.CHANGE_ROLE permission", async () => {
    vi.mocked(repo.findUserLink).mockResolvedValue({
      authorizingType: "NORMAL",
      roles: [{ roleId: 5 }],
    } as never);
    // requested roles differ from current {5}; session lacks CHANGE_ROLE
    await expect(updateUser(session, 2, { roleIds: ["5", "6"] })).rejects.toMatchObject({
      status: 403,
    });
    expect(repo.updatePartyUser).not.toHaveBeenCalled();
  });

  it("allows an unchanged role set through without CHANGE_ROLE", async () => {
    vi.mocked(repo.findUserLink).mockResolvedValue({
      authorizingType: "NORMAL",
      roles: [{ roleId: 5 }],
    } as never);
    vi.mocked(repo.updatePartyUser).mockResolvedValue({} as never);
    vi.mocked(repo.getUserWithLink).mockResolvedValue(userRow() as never);

    await updateUser(session, 2, { roleIds: ["5"], remark: "  trimmed  " });

    expect(vi.mocked(repo.updatePartyUser).mock.calls[0][2]).toMatchObject({ remark: "trimmed" });
  });
});

describe("toggleUserLock", () => {
  it("refuses to lock the session's own account", async () => {
    await expect(toggleUserLock(session, session.userId)).rejects.toMatchObject({
      code: ERR_USER_CANNOT_DISABLE_SELF,
    });
  });

  it("refuses to lock an ADMIN-authorized account", async () => {
    vi.mocked(repo.findUserLink).mockResolvedValue({ authorizingType: "ADMIN", status: "ACTIVE" } as never);
    await expect(toggleUserLock(session, 2)).rejects.toMatchObject({ code: ERR_USER_PROTECTED });
  });

  it("toggles ACTIVE → LOCKED", async () => {
    vi.mocked(repo.findUserLink).mockResolvedValue({ authorizingType: "NORMAL", status: "ACTIVE" } as never);
    vi.mocked(repo.updatePartyUser).mockResolvedValue({} as never);
    vi.mocked(repo.getUserWithLink).mockResolvedValue(userRow() as never);

    await toggleUserLock(session, 2);

    expect(vi.mocked(repo.updatePartyUser).mock.calls[0][2]).toMatchObject({ status: "LOCKED" });
  });
});

describe("resetUserPassword", () => {
  it("throws NOT_FOUND for a non-ACTIVE link", async () => {
    vi.mocked(repo.findUserLink).mockResolvedValue({ authorizingType: "NORMAL", status: "LOCKED" } as never);
    await expect(resetUserPassword(session, 2)).rejects.toMatchObject({ code: ERR_USER_NOT_FOUND });
    expect(createPasswordResetToken).not.toHaveBeenCalled();
  });

  it("issues a reset token and emails the reset link for an eligible user", async () => {
    vi.mocked(repo.findUserLink).mockResolvedValue({ authorizingType: "NORMAL", status: "ACTIVE" } as never);
    vi.mocked(repo.getUserWithLink).mockResolvedValue(userRow() as never);
    vi.mocked(createPasswordResetToken).mockResolvedValue("rtok");

    await resetUserPassword(session, 2);

    expect(createPasswordResetToken).toHaveBeenCalledWith(2);
    expect(sendResetLinkEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "bob@example.com", token: "rtok" }),
    );
  });
});

describe("cancelInvite", () => {
  it("throws when the invite is missing or not pending", async () => {
    vi.mocked(repo.findInvite).mockResolvedValue(null as never);
    await expect(cancelInvite(session, 9)).rejects.toMatchObject({ code: ERR_USER_CANCEL_NOT_PENDING });
  });

  it("deletes a pending invite", async () => {
    vi.mocked(repo.findInvite).mockResolvedValue({ operatorInviteId: 9, status: "PENDING" } as never);
    vi.mocked(repo.deleteInvite).mockResolvedValue({} as never);
    await cancelInvite(session, 9);
    expect(repo.deleteInvite).toHaveBeenCalledWith(9);
  });
});

describe("resendInvite", () => {
  it("throws NO_PENDING_INVITE when none is found", async () => {
    vi.mocked(repo.findPendingInvite).mockResolvedValue(null as never);
    await expect(resendInvite(session, 9)).rejects.toMatchObject({ code: ERR_USER_NO_PENDING_INVITE });
  });

  it("过期邀请 → ERR_USER_NO_PENDING_INVITE", async () => {
    vi.mocked(repo.findPendingInvite).mockResolvedValue(null as never); // 收紧后过期即 null
    await expect(resendInvite(session, 9)).rejects.toMatchObject({ code: ERR_USER_NO_PENDING_INVITE });
  });

  it("未过期 → 只 resendCount+1，不改 token/expiresAt", async () => {
    vi.mocked(repo.findPendingInvite).mockResolvedValue(inviteRow({ operatorInviteId: 9 }) as never);
    vi.mocked(repo.updateInvite).mockResolvedValue(inviteRow({ operatorInviteId: 9 }) as never);
    vi.mocked(repo.resolveUsernames).mockResolvedValue(new Map([[1, "admin"]]));
    await resendInvite(session, 9);
    const patch = vi.mocked(repo.updateInvite).mock.calls[0][1];
    expect(patch).toMatchObject({ resendCount: { increment: 1 } });
    expect(patch).not.toHaveProperty("token");
    expect(patch).not.toHaveProperty("expiresAt");
  });

  it("bumps resendCount and resolves a foreign inviter name from the repo", async () => {
    vi.mocked(repo.findPendingInvite).mockResolvedValue({ operatorInviteId: 9 } as never);
    vi.mocked(repo.updateInvite).mockResolvedValue(inviteRow({ inviterUserId: 77 }) as never);
    vi.mocked(repo.resolveUsernames).mockResolvedValue(new Map([[77, "dora"]]));

    const result = await resendInvite(session, 9);

    expect(vi.mocked(repo.updateInvite).mock.calls[0][1]).toMatchObject({ resendCount: { increment: 1 } });
    expect(result.invitedBy).toBe("dora");
    expect(sendInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "new@example.com", token: "tok", inviterName: "dora" }),
    );
  });
});

describe("setInviteRoles", () => {
  it("writes normalized roleIds to the pending invite", async () => {
    vi.mocked(repo.findPendingInvite).mockResolvedValue({ operatorInviteId: 9 } as never);
    vi.mocked(repo.updateInvite).mockResolvedValue(inviteRow({ inviterUserId: 1 }) as never);

    const result = await setInviteRoles(session, 9, { roleIds: ["2", "1", "2"] });

    expect(vi.mocked(repo.updateInvite).mock.calls[0][1]).toMatchObject({
      intendedRole: [{ roleId: 1 }, { roleId: 2 }],
    });
    // inviter is the session user → name comes from session, no repo lookup
    expect(result.invitedBy).toBe("admin");
  });
});

describe("regenerateInvite", () => {
  it("过期/无 → ERR_USER_NO_PENDING_INVITE", async () => {
    vi.mocked(repo.findPendingInvite).mockResolvedValue(null as never);
    await expect(regenerateInvite(session, 9)).rejects.toMatchObject({ code: ERR_USER_NO_PENDING_INVITE });
  });

  it("未过期 → 换 token + 刷 expiresAt，不动 resendCount", async () => {
    vi.mocked(repo.findPendingInvite).mockResolvedValue(inviteRow({ operatorInviteId: 9 }) as never);
    vi.mocked(repo.updateInvite).mockResolvedValue(inviteRow({ operatorInviteId: 9 }) as never);
    vi.mocked(repo.resolveUsernames).mockResolvedValue(new Map([[1, "admin"]]));
    await regenerateInvite(session, 9);
    const patch = vi.mocked(repo.updateInvite).mock.calls[0][1];
    expect(patch).toHaveProperty("token");
    expect(patch).toHaveProperty("expiresAt");
    expect(patch).not.toHaveProperty("resendCount");
  });
});
