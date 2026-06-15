import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ERR_OB_EMAIL_TAKEN,
  ERR_OB_INVITE_CONSUMED,
  ERR_OB_INVITE_EXPIRED,
  ERR_OB_INVITE_NOT_FOUND,
  ERR_OB_NOT_AUTHENTICATED,
} from "@/lib/onboarding-error-codes";

const { repo, buildSessionAndRedirect } = vi.hoisted(() => ({
  repo: {
    findInviteByToken: vi.fn(),
    findUserByEmail: vi.fn(),
    resolveInviterName: vi.fn(),
    bindInvite: vi.fn(),
  },
  buildSessionAndRedirect: vi.fn(),
}));
vi.mock("./onboarding.repository", () => repo);
vi.mock("@/service/auth/server/auth.service", () => ({ buildSessionAndRedirect }));

import { accept, getInvite } from "./onboarding.service";

function inviteRow(overrides: Record<string, unknown> = {}) {
  return {
    operatorInviteId: 7,
    partyId: 42,
    inviterUserId: 1,
    inviteEmail: "alice@x.com",
    intendedRole: [{ roleId: 150 }],
    token: "tok",
    expiresAt: new Date(Date.now() + 1_000_000),
    status: "PENDING",
    partner: { partyName: "BrightPOS" },
    ...overrides,
  };
}

beforeEach(() => {
  for (const fn of Object.values(repo)) fn.mockReset();
  buildSessionAndRedirect.mockReset().mockResolvedValue({ redirectTo: "http://console/api/auth/session-handoff?token=x" });
  repo.resolveInviterName.mockResolvedValue("Inviter");
});

describe("getInvite", () => {
  it("throws NOT_FOUND when token has no invite", async () => {
    repo.findInviteByToken.mockResolvedValue(null);
    await expect(getInvite("nope")).rejects.toMatchObject({ code: ERR_OB_INVITE_NOT_FOUND });
  });

  it("throws CONSUMED when invite is not PENDING", async () => {
    repo.findInviteByToken.mockResolvedValue(inviteRow({ status: "CONSUMED" }));
    await expect(getInvite("tok")).rejects.toMatchObject({ code: ERR_OB_INVITE_CONSUMED });
  });

  it("throws EXPIRED when past expiresAt", async () => {
    repo.findInviteByToken.mockResolvedValue(inviteRow({ expiresAt: new Date(Date.now() - 1) }));
    await expect(getInvite("tok")).rejects.toMatchObject({ code: ERR_OB_INVITE_EXPIRED });
  });

  it("returns the public invite for a valid token", async () => {
    const row = inviteRow();
    repo.findInviteByToken.mockResolvedValue(row);
    await expect(getInvite("tok")).resolves.toEqual({
      partyName: "BrightPOS",
      inviteEmail: "alice@x.com",
      intendedRole: [{ roleId: 150 }],
      expiresAt: row.expiresAt.toISOString(),
    });
  });
});

describe("accept", () => {
  it("rejects mode=existing without a session", async () => {
    repo.findInviteByToken.mockResolvedValue(inviteRow());
    await expect(accept({ mode: "existing", token: "tok" }, null)).rejects.toMatchObject({
      code: ERR_OB_NOT_AUTHENTICATED,
    });
    expect(repo.bindInvite).not.toHaveBeenCalled();
  });

  it("rejects register when the invited email already has an account", async () => {
    repo.findInviteByToken.mockResolvedValue(inviteRow());
    repo.findUserByEmail.mockResolvedValue({ userId: 99 });
    await expect(
      accept(
        { mode: "register", token: "tok", encryptedPassword: "x", displayName: "Al", country: "US" },
        null,
      ),
    ).rejects.toMatchObject({ code: ERR_OB_EMAIL_TAKEN });
    expect(repo.bindInvite).not.toHaveBeenCalled();
  });

  it("binds an existing session user and returns the redirect", async () => {
    repo.findInviteByToken.mockResolvedValue(inviteRow());
    repo.bindInvite.mockResolvedValue({ userId: 5 });

    const res = await accept({ mode: "existing", token: "tok" }, 5);

    expect(repo.bindInvite).toHaveBeenCalledWith(
      expect.objectContaining({ inviteId: 7, partyId: 42, userId: 5, roles: [{ roleId: 150 }] }),
    );
    expect(buildSessionAndRedirect).toHaveBeenCalledWith(5, ERR_OB_NOT_AUTHENTICATED);
    expect(res).toEqual({ redirectTo: "http://console/api/auth/session-handoff?token=x" });
  });
});
