import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ERR_AUTH_ACCOUNT_DISABLED,
  ERR_AUTH_ACCOUNT_LOCKED,
  ERR_AUTH_ENCRYPTION_INVALID,
  ERR_AUTH_INVALID_CREDENTIALS,
  ERR_AUTH_INVALID_PARTNER,
  ERR_AUTH_MFA_LOCKED,
  ERR_AUTH_MFA_TOKEN_INVALID,
  ERR_AUTH_REQUEST_EXPIRED,
} from "@/modules/identity/auth/error/auth.error-codes";

vi.mock("./auth.repository", () => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  recordLoginFailure: vi.fn(),
  recordLoginSuccess: vi.fn(),
  listPartyMemberships: vi.fn(),
  findPartyMembership: vi.fn(),
}));
vi.mock("@/modules/identity/mfa/server/mfa.public", () => ({ verifyActiveTotp: vi.fn() }));
vi.mock("@/lib/session-snapshot", () => ({ buildSessionSnapshot: vi.fn() }));
vi.mock("@/lib/login-checks", () => ({
  isAccountActive: vi.fn(),
  isLockActive: vi.fn(),
  isTimestampFresh: vi.fn(),
  computeFailureUpdate: vi.fn(),
}));
vi.mock("@/lib/login-token", () => ({
  createMfaLoginToken: vi.fn(),
  readMfaLoginToken: vi.fn(),
  deleteMfaLoginToken: vi.fn(),
}));
vi.mock("@cloud/security/server", () => ({ verifyPassword: vi.fn(), decryptRsaOaep: vi.fn() }));
vi.mock("@cloud/config", () => ({
  getConfig: vi.fn(() => ({
    NEXT_AUTH_LOGIN_RSA_PRIVATE_KEY: {
      key: Buffer.from("ZGVy", "base64"),
      format: "der",
      type: "pkcs8",
    },
  })),
}));
vi.mock("@cloud/permissions/server", () => ({
  SESSION_TTL_SECONDS: 3600,
  createSession: vi.fn(),
  updateSession: vi.fn(),
  createSessionHandoffToken: vi.fn(),
}));
vi.mock("./partner-choices", () => ({ listPartyChoices: vi.fn() }));
vi.mock("@/lib/login-nonce", () => ({ consumeLoginNonce: vi.fn(), issueLoginNonce: vi.fn() }));
vi.mock("@cloud/platform-config", () => ({ resolvePortalGroup: vi.fn() }));
vi.mock("@/lib/platform-routing", () => ({
  entryUrlForParty: vi.fn(() => "http://console.test/session-handoff"),
}));

import * as repo from "./auth.repository";
import { listPartyChoices } from "./partner-choices";
import * as mfa from "@/modules/identity/mfa/server/mfa.public";
import { buildSessionSnapshot } from "@/lib/session-snapshot";
import { isAccountActive, isLockActive, isTimestampFresh } from "@/lib/login-checks";
import { createMfaLoginToken, readMfaLoginToken, deleteMfaLoginToken } from "@/lib/login-token";
import { verifyPassword, decryptRsaOaep } from "@cloud/security/server";
import { createSession, createSessionHandoffToken } from "@cloud/permissions/server";
import { consumeLoginNonce } from "@/lib/login-nonce";
import { resolvePortalGroup } from "@cloud/platform-config";
import { login, verifyMfa, selectPartner, buildDevAuthBypassSession } from "./auth.service";

const ACTIVE_USER = {
  userId: 1,
  status: "ACTIVE",
  passwordErrorLockExpiredTimestamp: null,
  passwordHash: "hash",
  passwordErrorTimes: 0,
  mfaEnable: false,
};
const goodInput = { email: "alice@x.io", encryptedPassword: "enc" };

function armDecryptSuccess() {
  vi.mocked(decryptRsaOaep).mockReturnValue(
    JSON.stringify({ password: "pw", timestamp: 1, nonce: "n" }),
  );
  vi.mocked(isTimestampFresh).mockReturnValue(true);
  vi.mocked(consumeLoginNonce).mockResolvedValue(true);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(isAccountActive).mockReturnValue(true);
  vi.mocked(isLockActive).mockReturnValue(false);
  vi.mocked(resolvePortalGroup).mockReturnValue("MERCHANT");
  vi.mocked(createSessionHandoffToken).mockResolvedValue("tok");
});

describe("login", () => {
  it("rejects an unknown account", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(null as never);
    await expect(login(goodInput)).rejects.toMatchObject({
      code: ERR_AUTH_INVALID_CREDENTIALS,
      status: 401,
    });
  });

  it("rejects a disabled account", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(isAccountActive).mockReturnValue(false);
    await expect(login(goodInput)).rejects.toMatchObject({
      code: ERR_AUTH_ACCOUNT_DISABLED,
      status: 403,
    });
  });

  it("rejects a locked account", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(isLockActive).mockReturnValue(true);
    await expect(login(goodInput)).rejects.toMatchObject({
      code: ERR_AUTH_ACCOUNT_LOCKED,
      status: 403,
    });
  });

  it("rejects an undecryptable payload", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(decryptRsaOaep).mockImplementation(() => {
      throw new Error("bad");
    });
    await expect(login(goodInput)).rejects.toMatchObject({ code: ERR_AUTH_ENCRYPTION_INVALID });
  });

  it("rejects a stale timestamp", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(decryptRsaOaep).mockReturnValue(
      JSON.stringify({ password: "pw", timestamp: 1, nonce: "n" }),
    );
    vi.mocked(isTimestampFresh).mockReturnValue(false);
    await expect(login(goodInput)).rejects.toMatchObject({ code: ERR_AUTH_REQUEST_EXPIRED });
  });

  it("records a failure and rejects a wrong password", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(ACTIVE_USER as never);
    armDecryptSuccess();
    vi.mocked(verifyPassword).mockResolvedValue(false);
    await expect(login(goodInput)).rejects.toMatchObject({
      code: ERR_AUTH_INVALID_CREDENTIALS,
      status: 401,
    });
    expect(repo.recordLoginFailure).toHaveBeenCalled();
  });

  it("returns an MFA token (no session) when MFA is enabled", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue({ ...ACTIVE_USER, mfaEnable: true } as never);
    armDecryptSuccess();
    vi.mocked(verifyPassword).mockResolvedValue(true);
    vi.mocked(createMfaLoginToken).mockResolvedValue("mfatok");

    const result = await login(goodInput);

    expect(result).toEqual({ mfaRequired: true, mfaToken: "mfatok" });
    expect(createSession).not.toHaveBeenCalled();
  });

  it("redirects to / when exactly one partner is selectable", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(ACTIVE_USER as never);
    armDecryptSuccess();
    vi.mocked(verifyPassword).mockResolvedValue(true);
    vi.mocked(listPartyChoices).mockResolvedValue([
      {
        partyId: 100,
        partyName: "A",
        partnerStatus: "ACTIVE",
        userStatus: "ACTIVE",
        authorizingType: "NORMAL",
        validContract: true,
      },
    ] as never);
    vi.mocked(buildSessionSnapshot).mockResolvedValue({
      currentPartyId: 100,
      contractTypes: ["MERCHANT"],
    } as never);

    const result = await login(goodInput);

    expect(buildSessionSnapshot).toHaveBeenCalledWith(ACTIVE_USER.userId, 100);
    expect(result).toEqual({ redirectTo: "http://console.test/session-handoff" });
    expect(createSession).toHaveBeenCalled();
  });

  it("redirects to /select-partner when multiple partners are selectable", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(ACTIVE_USER as never);
    armDecryptSuccess();
    vi.mocked(verifyPassword).mockResolvedValue(true);
    vi.mocked(listPartyChoices).mockResolvedValue([
      {
        partyId: 1,
        partyName: "A",
        partnerStatus: "ACTIVE",
        userStatus: "ACTIVE",
        authorizingType: "NORMAL",
        validContract: true,
      },
      {
        partyId: 2,
        partyName: "B",
        partnerStatus: "ACTIVE",
        userStatus: "ACTIVE",
        authorizingType: "NORMAL",
        validContract: true,
      },
    ] as never);
    vi.mocked(buildSessionSnapshot).mockResolvedValue({ currentPartyId: null } as never);

    const result = await login(goodInput);

    expect(buildSessionSnapshot).toHaveBeenCalledWith(ACTIVE_USER.userId, null);
    expect(result).toEqual({ redirectTo: "/select-partner" });
  });

  it("redirects to /select-partner when no partner is selectable", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(ACTIVE_USER as never);
    armDecryptSuccess();
    vi.mocked(verifyPassword).mockResolvedValue(true);
    vi.mocked(listPartyChoices).mockResolvedValue([
      {
        partyId: 1,
        partyName: "A",
        partnerStatus: "ACTIVE",
        userStatus: "ACTIVE",
        authorizingType: "NORMAL",
        validContract: false,
      },
    ] as never);
    vi.mocked(buildSessionSnapshot).mockResolvedValue({ currentPartyId: null } as never);

    const result = await login(goodInput);

    expect(result).toEqual({ redirectTo: "/select-partner" });
  });
});

describe("verifyMfa", () => {
  it("rejects an unknown / expired token", async () => {
    vi.mocked(readMfaLoginToken).mockResolvedValue(null);
    await expect(verifyMfa({ mfaToken: "x", code: "123456" })).rejects.toMatchObject({
      code: ERR_AUTH_MFA_TOKEN_INVALID,
      status: 401,
    });
  });

  it("maps a locked factor to 423", async () => {
    vi.mocked(readMfaLoginToken).mockResolvedValue({ userId: 1 });
    vi.mocked(repo.findUserById).mockResolvedValue({ status: "ACTIVE", mfaEnable: true } as never);
    vi.mocked(mfa.verifyActiveTotp).mockResolvedValue("locked");
    await expect(verifyMfa({ mfaToken: "x", code: "000000" })).rejects.toMatchObject({
      code: ERR_AUTH_MFA_LOCKED,
      status: 423,
    });
  });

  it("consumes the token and builds the session on success", async () => {
    vi.mocked(readMfaLoginToken).mockResolvedValue({ userId: 1 });
    vi.mocked(repo.findUserById).mockResolvedValue({ status: "ACTIVE", mfaEnable: true } as never);
    vi.mocked(mfa.verifyActiveTotp).mockResolvedValue("ok");
    vi.mocked(listPartyChoices).mockResolvedValue([] as never);
    vi.mocked(buildSessionSnapshot).mockResolvedValue({ currentPartyId: null } as never);

    const result = await verifyMfa({ mfaToken: "x", code: "123456" });

    expect(deleteMfaLoginToken).toHaveBeenCalledWith("x");
    expect(result).toEqual({ redirectTo: "/select-partner" });
  });
});

describe("selectPartner", () => {
  it("rejects an inactive / foreign membership", async () => {
    vi.mocked(repo.findPartyMembership).mockResolvedValue(null as never);
    await expect(selectPartner(1, 100)).rejects.toMatchObject({ code: ERR_AUTH_INVALID_PARTNER });
  });

  it("updates the session and redirects on success", async () => {
    vi.mocked(repo.findPartyMembership).mockResolvedValue({
      status: "ACTIVE",
      partner: { status: "ACTIVE" },
    } as never);
    vi.mocked(buildSessionSnapshot).mockResolvedValue({
      currentPartyId: 100,
      contractTypes: ["MERCHANT"],
    } as never);

    const result = await selectPartner(1, 100);
    expect(result).toEqual({ redirectTo: "http://console.test/session-handoff" });
  });
});

describe("buildDevAuthBypassSession", () => {
  it("returns null for an unknown or inactive account", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(null as never);
    await expect(buildDevAuthBypassSession("admin@example.com")).resolves.toBeNull();

    vi.mocked(repo.findUserByEmail).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(isAccountActive).mockReturnValue(false);
    await expect(buildDevAuthBypassSession("admin@example.com")).resolves.toBeNull();
  });

  it("builds an in-memory active session without writing Redis or cookies", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(listPartyChoices).mockResolvedValue([
      {
        partyId: 100,
        partyName: "A",
        partnerStatus: "ACTIVE",
        userStatus: "ACTIVE",
        authorizingType: "ADMIN",
        validContract: true,
      },
    ] as never);
    vi.mocked(buildSessionSnapshot).mockResolvedValue({
      userId: 1,
      displayName: "Admin",
      email: "admin@example.com",
      currentPartyId: 100,
      partyName: "A",
      contractTypes: ["ADMIN"],
      authorizingType: "ADMIN",
      roles: [],
      permissions: ["system.users.create"],
      partners: [],
      mfaPassed: true,
    } as never);

    const session = await buildDevAuthBypassSession("admin@example.com");

    expect(repo.findUserByEmail).toHaveBeenCalledWith("admin@example.com");
    expect(buildSessionSnapshot).toHaveBeenCalledWith(ACTIVE_USER.userId, 100);
    expect(createSession).not.toHaveBeenCalled();
    expect(session).toMatchObject({
      userId: 1,
      currentPartyId: 100,
      permissions: ["system.users.create"],
      loginAt: expect.any(Number),
      expireAt: expect.any(Number),
    });
    expect(session!.expireAt).toBeGreaterThan(session!.loginAt);
  });
});
