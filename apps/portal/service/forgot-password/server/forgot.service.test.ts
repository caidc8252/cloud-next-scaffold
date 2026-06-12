import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERR_FP_CODE_INVALID, ERR_FP_PASSWORD_REUSED } from "@/lib/forgot-error-codes";

const { repo, recovery, email, pwInput, security } = vi.hoisted(() => ({
  repo: { findUserByEmail: vi.fn(), updatePassword: vi.fn() },
  recovery: { issueRecoveryCode: vi.fn(), isRecoveryCodeValid: vi.fn(), consumeRecoveryCode: vi.fn() },
  email: { sendVerifyCodeEmail: vi.fn() },
  pwInput: { decryptAndValidatePassword: vi.fn() },
  security: { hashPassword: vi.fn(), verifyPassword: vi.fn() },
}));
vi.mock("./forgot.repository", () => repo);
vi.mock("@/lib/recovery-code", () => recovery);
vi.mock("@/lib/email", () => email);
vi.mock("@/lib/password-input", () => pwInput);
vi.mock("@cloud/security/server", () => security);

import { resetPassword, sendRecoveryCode, verifyRecoveryCode } from "./forgot.service";

beforeEach(() => {
  for (const group of [repo, recovery, email, pwInput, security]) {
    for (const fn of Object.values(group)) fn.mockReset();
  }
});

describe("sendRecoveryCode", () => {
  it("issues + emails for an ACTIVE user, returns ok", async () => {
    repo.findUserByEmail.mockResolvedValue({ userId: 1, status: "ACTIVE" });
    recovery.issueRecoveryCode.mockResolvedValue("123456");
    const res = await sendRecoveryCode({ email: "a@x.com" });
    expect(res).toEqual({ ok: true, cooldownSeconds: 60 });
    expect(email.sendVerifyCodeEmail).toHaveBeenCalledWith({ to: "a@x.com", code: "123456", intent: "passwordRecovery" });
  });

  it("returns ok without issuing for an unknown email (anti-enumeration)", async () => {
    repo.findUserByEmail.mockResolvedValue(null);
    const res = await sendRecoveryCode({ email: "ghost@x.com" });
    expect(res).toEqual({ ok: true, cooldownSeconds: 60 });
    expect(recovery.issueRecoveryCode).not.toHaveBeenCalled();
    expect(email.sendVerifyCodeEmail).not.toHaveBeenCalled();
  });

  it("swallows email failures and still returns ok", async () => {
    repo.findUserByEmail.mockResolvedValue({ userId: 1, status: "ACTIVE" });
    recovery.issueRecoveryCode.mockResolvedValue("123456");
    email.sendVerifyCodeEmail.mockRejectedValue(new Error("throttled"));
    await expect(sendRecoveryCode({ email: "a@x.com" })).resolves.toEqual({ ok: true, cooldownSeconds: 60 });
  });
});

describe("verifyRecoveryCode", () => {
  it("ok for a matching code", async () => {
    recovery.isRecoveryCodeValid.mockResolvedValue(true);
    await expect(verifyRecoveryCode({ email: "a@x.com", code: "123456" })).resolves.toEqual({ ok: true });
  });
  it("rejects an invalid code", async () => {
    recovery.isRecoveryCodeValid.mockResolvedValue(false);
    await expect(verifyRecoveryCode({ email: "a@x.com", code: "000000" })).rejects.toMatchObject({
      code: ERR_FP_CODE_INVALID,
    });
  });
});

describe("resetPassword", () => {
  const input = { email: "a@x.com", code: "123456", encryptedPassword: "enc" };

  it("rejects when the code is invalid", async () => {
    recovery.isRecoveryCodeValid.mockResolvedValue(false);
    await expect(resetPassword(input)).rejects.toMatchObject({ code: ERR_FP_CODE_INVALID });
    expect(repo.updatePassword).not.toHaveBeenCalled();
  });

  it("rejects a reused password", async () => {
    recovery.isRecoveryCodeValid.mockResolvedValue(true);
    repo.findUserByEmail.mockResolvedValue({ userId: 1, status: "ACTIVE", passwordHash: "old", passwordHistory: [] });
    pwInput.decryptAndValidatePassword.mockResolvedValue("NewPassw0rd!");
    security.verifyPassword.mockResolvedValue(true); // matches a recent hash
    await expect(resetPassword(input)).rejects.toMatchObject({ code: ERR_FP_PASSWORD_REUSED });
    expect(repo.updatePassword).not.toHaveBeenCalled();
  });

  it("updates password, history and consumes the code on success", async () => {
    recovery.isRecoveryCodeValid.mockResolvedValue(true);
    repo.findUserByEmail.mockResolvedValue({ userId: 1, status: "ACTIVE", passwordHash: "old", passwordHistory: ["h1"] });
    pwInput.decryptAndValidatePassword.mockResolvedValue("NewPassw0rd!");
    security.verifyPassword.mockResolvedValue(false);
    security.hashPassword.mockResolvedValue("newhash");

    await expect(resetPassword(input)).resolves.toEqual({ ok: true });
    expect(repo.updatePassword).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ passwordHash: "newhash", passwordHistory: ["old", "h1"] }),
    );
    expect(recovery.consumeRecoveryCode).toHaveBeenCalledWith("a@x.com");
  });
});
