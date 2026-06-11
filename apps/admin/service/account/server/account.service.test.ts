import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ERR_ACCOUNT_EMAIL_SAME,
  ERR_ACCOUNT_EMAIL_TAKEN,
  ERR_ACCOUNT_MFA_ENROLL_CODE_INVALID,
  ERR_ACCOUNT_MFA_NOT_ENABLED,
  ERR_ACCOUNT_MFA_PENDING_MISSING,
  ERR_ACCOUNT_MFA_STEPUP_INVALID,
  ERR_ACCOUNT_VERIFY_CODE_INVALID,
} from "@/lib/account-error-codes";
import type { ActiveSession } from "@cloud/permissions/server";

// 全 I/O 边界工厂 mock,隔离出 service 的编排 / 分支。
vi.mock("./account.repository", () => ({
  getUser: vi.fn(),
  findUserByEmail: vi.fn(),
  updateUser: vi.fn(),
  listPartyMemberships: vi.fn(),
  listActiveContractTypes: vi.fn(),
}));
vi.mock("@/service/mfa/server/mfa.service", () => ({
  verifyActiveTotp: vi.fn(),
  getMfaStatus: vi.fn(),
  startEnrollment: vi.fn(),
  activateEnrollment: vi.fn(),
  disableMfa: vi.fn(),
}));
vi.mock("@/lib/account-verify-code", () => ({
  readVerifyCode: vi.fn(),
  consumeVerifyCode: vi.fn(),
  issueVerifyCode: vi.fn(),
  deliverVerifyCode: vi.fn(),
}));
vi.mock("@/lib/session-snapshot", () => ({ buildSessionSnapshot: vi.fn().mockResolvedValue(null) }));
vi.mock("@cloud/permissions/server", () => ({ updateSession: vi.fn() }));

import * as repo from "./account.repository";
import * as mfa from "@/service/mfa/server/mfa.service";
import { readVerifyCode, consumeVerifyCode } from "@/lib/account-verify-code";
import {
  activateMfa,
  changeEmail,
  disableAccountMfa,
  listPartners,
} from "./account.service";

const session = { userId: 1, currentPartyId: 100 } as unknown as ActiveSession;

beforeEach(() => {
  vi.resetAllMocks();
});

describe("changeEmail", () => {
  it("rejects when the new-email code or address does not match", async () => {
    vi.mocked(repo.getUser).mockResolvedValue({ email: "old@x.com" } as never);
    vi.mocked(readVerifyCode)
      .mockResolvedValueOnce({ code: "111111" } as never) // EMAIL_CURRENT ok
      .mockResolvedValueOnce({ code: "222222", newEmail: "other@x.com" } as never); // EMAIL_NEW mismatch
    await expect(
      changeEmail(session, { newEmail: "new@x.com", currentCode: "111111", newCode: "222222" }),
    ).rejects.toMatchObject({ code: ERR_ACCOUNT_VERIFY_CODE_INVALID });
  });

  it("rejects an unchanged email", async () => {
    vi.mocked(repo.getUser).mockResolvedValue({ email: "New@x.com" } as never);
    vi.mocked(readVerifyCode)
      .mockResolvedValueOnce({ code: "111111" } as never)
      .mockResolvedValueOnce({ code: "222222", newEmail: "new@x.com" } as never);
    await expect(
      changeEmail(session, { newEmail: "new@x.com", currentCode: "111111", newCode: "222222" }),
    ).rejects.toMatchObject({ code: ERR_ACCOUNT_EMAIL_SAME });
  });

  it("rejects a taken email with 409", async () => {
    vi.mocked(repo.getUser).mockResolvedValue({ email: "old@x.com" } as never);
    vi.mocked(readVerifyCode)
      .mockResolvedValueOnce({ code: "111111" } as never)
      .mockResolvedValueOnce({ code: "222222", newEmail: "new@x.com" } as never);
    vi.mocked(repo.findUserByEmail).mockResolvedValue({ userId: 2 } as never);
    await expect(
      changeEmail(session, { newEmail: "new@x.com", currentCode: "111111", newCode: "222222" }),
    ).rejects.toMatchObject({ code: ERR_ACCOUNT_EMAIL_TAKEN, status: 409 });
  });
});

describe("activateMfa", () => {
  it("maps a missing pending enrollment", async () => {
    vi.mocked(mfa.activateEnrollment).mockResolvedValue("missing");
    await expect(activateMfa(session, { mfaInfoId: 5, code: "123456" })).rejects.toMatchObject({
      code: ERR_ACCOUNT_MFA_PENDING_MISSING,
    });
  });

  it("maps an invalid code", async () => {
    vi.mocked(mfa.activateEnrollment).mockResolvedValue("invalid");
    await expect(activateMfa(session, { mfaInfoId: 5, code: "000000" })).rejects.toMatchObject({
      code: ERR_ACCOUNT_MFA_ENROLL_CODE_INVALID,
    });
  });

  it("returns refreshed security on success", async () => {
    vi.mocked(mfa.activateEnrollment).mockResolvedValue("ok");
    vi.mocked(repo.getUser).mockResolvedValue({ mfaEnable: true, passwordChangedTimestamp: null } as never);
    vi.mocked(mfa.getMfaStatus).mockResolvedValue("ACTIVE");

    const security = await activateMfa(session, { mfaInfoId: 5, code: "123456" });

    expect(security.mfaEnable).toBe(true);
    expect(security.mfaStatus).toBe("ACTIVE");
  });
});

describe("disableAccountMfa", () => {
  it("rejects when MFA is not enabled", async () => {
    vi.mocked(repo.getUser).mockResolvedValue({ mfaEnable: false } as never);
    await expect(disableAccountMfa(session, { code: "123456" })).rejects.toMatchObject({
      code: ERR_ACCOUNT_MFA_NOT_ENABLED,
    });
  });

  it("rejects an invalid step-up code", async () => {
    vi.mocked(repo.getUser).mockResolvedValue({ mfaEnable: true } as never);
    vi.mocked(mfa.verifyActiveTotp).mockResolvedValue("invalid");
    await expect(disableAccountMfa(session, { code: "000000" })).rejects.toMatchObject({
      code: ERR_ACCOUNT_MFA_STEPUP_INVALID,
    });
    expect(mfa.disableMfa).not.toHaveBeenCalled();
  });

  it("disables and returns refreshed security on a valid code", async () => {
    vi.mocked(repo.getUser)
      .mockResolvedValueOnce({ mfaEnable: true } as never) // guard read
      .mockResolvedValueOnce({ mfaEnable: false, passwordChangedTimestamp: null } as never); // getAccountSecurity
    vi.mocked(mfa.verifyActiveTotp).mockResolvedValue("ok");
    vi.mocked(mfa.getMfaStatus).mockResolvedValue("NONE");

    const security = await disableAccountMfa(session, { code: "123456" });

    expect(mfa.disableMfa).toHaveBeenCalledWith(1);
    expect(security.mfaEnable).toBe(false);
  });
});

describe("listPartners", () => {
  it("derives contract types and sorts current → active → locked", async () => {
    vi.mocked(repo.listPartyMemberships).mockResolvedValue([
      { partyUserId: 1, partyId: 100, partner: { partyName: "A" }, authorizingType: "NORMAL", authorizingTimestamp: null, status: "ACTIVE" },
      { partyUserId: 2, partyId: 200, partner: { partyName: "B" }, authorizingType: "ADMIN", authorizingTimestamp: null, status: "LOCKED" },
    ] as never);
    vi.mocked(repo.listActiveContractTypes).mockResolvedValue([
      { authorizedPartyId: 100, authorizedContractType: "ISO" },
      { authorizedPartyId: 100, authorizedContractType: "ISO" },
    ] as never);

    const partners = await listPartners(1, 100);

    expect(partners[0].partyId).toBe(100);
    expect(partners[0].isCurrent).toBe(true);
    expect(partners[0].contractTypes).toEqual(["ISO"]);
    expect(partners[1].locked).toBe(true);
  });
});
