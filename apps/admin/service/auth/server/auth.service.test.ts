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
} from "@/lib/auth-error-codes";

vi.mock("./auth.repository", () => ({
  findUserByUsername: vi.fn(),
  findUserById: vi.fn(),
  recordLoginFailure: vi.fn(),
  recordLoginSuccess: vi.fn(),
  listPartnerMemberships: vi.fn(),
  findPartnerMembership: vi.fn(),
}));
vi.mock("@/service/mfa/server/mfa.service", () => ({ verifyActiveTotp: vi.fn() }));
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
  getAuthConfig: vi.fn(() => ({
    rsaPrivateKey: { key: Buffer.from("ZGVy", "base64"), format: "der", type: "pkcs8" },
    timestampWindowMs: 60_000,
    maxPasswordErrorTimes: 6,
    lockDurationMinutes: 30,
  })),
}));
vi.mock("@cloud/permissions/server", () => ({ createSession: vi.fn(), updateSession: vi.fn() }));
vi.mock("./partner-choices", () => ({ listPartnerChoices: vi.fn() }));

import * as repo from "./auth.repository";
import { listPartnerChoices } from "./partner-choices";
import * as mfa from "@/service/mfa/server/mfa.service";
import { buildSessionSnapshot } from "@/lib/session-snapshot";
import { isAccountActive, isLockActive, isTimestampFresh } from "@/lib/login-checks";
import { createMfaLoginToken, readMfaLoginToken, deleteMfaLoginToken } from "@/lib/login-token";
import { verifyPassword, decryptRsaOaep } from "@cloud/security/server";
import { createSession } from "@cloud/permissions/server";
import { login, verifyMfa, selectPartner } from "./auth.service";

const ACTIVE_USER = {
  userId: 1,
  status: "ACTIVE",
  passwordErrorLockExpiredTimestamp: null,
  passwordHash: "hash",
  passwordErrorTimes: 0,
  mfaEnable: false,
};
const goodInput = { account: "alice", encryptedPassword: "enc" };

function armDecryptSuccess() {
  vi.mocked(decryptRsaOaep).mockReturnValue(JSON.stringify({ password: "pw", timestamp: 1 }));
  vi.mocked(isTimestampFresh).mockReturnValue(true);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(isAccountActive).mockReturnValue(true);
  vi.mocked(isLockActive).mockReturnValue(false);
});

describe("login", () => {
  it("rejects an unknown account", async () => {
    vi.mocked(repo.findUserByUsername).mockResolvedValue(null as never);
    await expect(login(goodInput)).rejects.toMatchObject({ code: ERR_AUTH_INVALID_CREDENTIALS, status: 401 });
  });

  it("rejects a disabled account", async () => {
    vi.mocked(repo.findUserByUsername).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(isAccountActive).mockReturnValue(false);
    await expect(login(goodInput)).rejects.toMatchObject({ code: ERR_AUTH_ACCOUNT_DISABLED, status: 403 });
  });

  it("rejects a locked account", async () => {
    vi.mocked(repo.findUserByUsername).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(isLockActive).mockReturnValue(true);
    await expect(login(goodInput)).rejects.toMatchObject({ code: ERR_AUTH_ACCOUNT_LOCKED, status: 403 });
  });

  it("rejects an undecryptable payload", async () => {
    vi.mocked(repo.findUserByUsername).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(decryptRsaOaep).mockImplementation(() => {
      throw new Error("bad");
    });
    await expect(login(goodInput)).rejects.toMatchObject({ code: ERR_AUTH_ENCRYPTION_INVALID });
  });

  it("rejects a stale timestamp", async () => {
    vi.mocked(repo.findUserByUsername).mockResolvedValue(ACTIVE_USER as never);
    vi.mocked(decryptRsaOaep).mockReturnValue(JSON.stringify({ password: "pw", timestamp: 1 }));
    vi.mocked(isTimestampFresh).mockReturnValue(false);
    await expect(login(goodInput)).rejects.toMatchObject({ code: ERR_AUTH_REQUEST_EXPIRED });
  });

  it("records a failure and rejects a wrong password", async () => {
    vi.mocked(repo.findUserByUsername).mockResolvedValue(ACTIVE_USER as never);
    armDecryptSuccess();
    vi.mocked(verifyPassword).mockResolvedValue(false);
    await expect(login(goodInput)).rejects.toMatchObject({ code: ERR_AUTH_INVALID_CREDENTIALS, status: 401 });
    expect(repo.recordLoginFailure).toHaveBeenCalled();
  });

  it("returns an MFA token (no session) when MFA is enabled", async () => {
    vi.mocked(repo.findUserByUsername).mockResolvedValue({ ...ACTIVE_USER, mfaEnable: true } as never);
    armDecryptSuccess();
    vi.mocked(verifyPassword).mockResolvedValue(true);
    vi.mocked(createMfaLoginToken).mockResolvedValue("mfatok");

    const result = await login(goodInput);

    expect(result).toEqual({ mfaRequired: true, mfaToken: "mfatok" });
    expect(createSession).not.toHaveBeenCalled();
  });

  it("redirects to / when exactly one partner is selectable", async () => {
    vi.mocked(repo.findUserByUsername).mockResolvedValue(ACTIVE_USER as never);
    armDecryptSuccess();
    vi.mocked(verifyPassword).mockResolvedValue(true);
    vi.mocked(listPartnerChoices).mockResolvedValue([
      { partnerId: 100, partnerName: "A", partnerStatus: "ACTIVE", userStatus: "ACTIVE", authorizingType: "NORMAL", validContract: true },
    ] as never);
    vi.mocked(buildSessionSnapshot).mockResolvedValue({ currentPartnerId: 100 } as never);

    const result = await login(goodInput);

    expect(buildSessionSnapshot).toHaveBeenCalledWith(ACTIVE_USER.userId, 100);
    expect(result).toEqual({ redirectTo: "/" });
    expect(createSession).toHaveBeenCalled();
  });

  it("redirects to /select-partner when multiple partners are selectable", async () => {
    vi.mocked(repo.findUserByUsername).mockResolvedValue(ACTIVE_USER as never);
    armDecryptSuccess();
    vi.mocked(verifyPassword).mockResolvedValue(true);
    vi.mocked(listPartnerChoices).mockResolvedValue([
      { partnerId: 1, partnerName: "A", partnerStatus: "ACTIVE", userStatus: "ACTIVE", authorizingType: "NORMAL", validContract: true },
      { partnerId: 2, partnerName: "B", partnerStatus: "ACTIVE", userStatus: "ACTIVE", authorizingType: "NORMAL", validContract: true },
    ] as never);
    vi.mocked(buildSessionSnapshot).mockResolvedValue({ currentPartnerId: null } as never);

    const result = await login(goodInput);

    expect(buildSessionSnapshot).toHaveBeenCalledWith(ACTIVE_USER.userId, null);
    expect(result).toEqual({ redirectTo: "/select-partner" });
  });

  it("redirects to /select-partner when no partner is selectable", async () => {
    vi.mocked(repo.findUserByUsername).mockResolvedValue(ACTIVE_USER as never);
    armDecryptSuccess();
    vi.mocked(verifyPassword).mockResolvedValue(true);
    vi.mocked(listPartnerChoices).mockResolvedValue([
      { partnerId: 1, partnerName: "A", partnerStatus: "ACTIVE", userStatus: "ACTIVE", authorizingType: "NORMAL", validContract: false },
    ] as never);
    vi.mocked(buildSessionSnapshot).mockResolvedValue({ currentPartnerId: null } as never);

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
    vi.mocked(readMfaLoginToken).mockResolvedValue(1);
    vi.mocked(repo.findUserById).mockResolvedValue({ status: "ACTIVE", mfaEnable: true } as never);
    vi.mocked(mfa.verifyActiveTotp).mockResolvedValue("locked");
    await expect(verifyMfa({ mfaToken: "x", code: "000000" })).rejects.toMatchObject({
      code: ERR_AUTH_MFA_LOCKED,
      status: 423,
    });
  });

  it("consumes the token and builds the session on success", async () => {
    vi.mocked(readMfaLoginToken).mockResolvedValue(1);
    vi.mocked(repo.findUserById).mockResolvedValue({ status: "ACTIVE", mfaEnable: true } as never);
    vi.mocked(mfa.verifyActiveTotp).mockResolvedValue("ok");
    vi.mocked(listPartnerChoices).mockResolvedValue([] as never);
    vi.mocked(buildSessionSnapshot).mockResolvedValue({ currentPartnerId: null } as never);

    const result = await verifyMfa({ mfaToken: "x", code: "123456" });

    expect(deleteMfaLoginToken).toHaveBeenCalledWith("x");
    expect(result).toEqual({ redirectTo: "/select-partner" });
  });
});

describe("selectPartner", () => {
  it("rejects an inactive / foreign membership", async () => {
    vi.mocked(repo.findPartnerMembership).mockResolvedValue(null as never);
    await expect(selectPartner(1, 100)).rejects.toMatchObject({ code: ERR_AUTH_INVALID_PARTNER });
  });

  it("updates the session and redirects on success", async () => {
    vi.mocked(repo.findPartnerMembership).mockResolvedValue({
      status: "ACTIVE",
      partner: { status: "ACTIVE" },
    } as never);
    vi.mocked(buildSessionSnapshot).mockResolvedValue({ currentPartnerId: 100 } as never);

    const result = await selectPartner(1, 100);
    expect(result).toEqual({ redirectTo: "/" });
  });
});
