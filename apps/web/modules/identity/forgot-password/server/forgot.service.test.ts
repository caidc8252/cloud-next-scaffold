import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERR_FP_TOKEN_INVALID, ERR_FP_PASSWORD_REUSED } from "@/lib/forgot-error-codes";

const { repo, token, email, pwInput, security } = vi.hoisted(() => ({
  repo: { findUserByEmail: vi.fn(), findUserById: vi.fn(), updatePassword: vi.fn() },
  token: { issueSelfServiceResetToken: vi.fn(), readResetToken: vi.fn(), consumeResetToken: vi.fn() },
  email: { sendResetLinkEmail: vi.fn() },
  pwInput: { decryptAndValidatePassword: vi.fn() },
  security: { hashPassword: vi.fn(), verifyPassword: vi.fn() },
}));
vi.mock("./forgot.repository", () => repo);
vi.mock("@/lib/password-reset-token", () => token);
vi.mock("@/lib/email", () => email);
vi.mock("@/lib/password-input", () => pwInput);
vi.mock("@cloud/security/server", () => security);

import { resetPassword, sendResetLink, validateResetToken } from "./forgot.service";

beforeEach(() => {
  for (const group of [repo, token, email, pwInput, security]) {
    for (const fn of Object.values(group)) fn.mockReset();
  }
});

describe("sendResetLink", () => {
  it("issues a token + emails a link for an ACTIVE user, returns ok", async () => {
    repo.findUserByEmail.mockResolvedValue({ userId: 1, status: "ACTIVE" });
    token.issueSelfServiceResetToken.mockResolvedValue("tok123");
    const res = await sendResetLink({ email: "a@x.com" });
    expect(res).toEqual({ ok: true, cooldownSeconds: 60 });
    expect(token.issueSelfServiceResetToken).toHaveBeenCalledWith(1);
    expect(email.sendResetLinkEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "a@x.com", token: "tok123" }));
  });

  it("returns ok without issuing for an unknown email (anti-enumeration)", async () => {
    repo.findUserByEmail.mockResolvedValue(null);
    await expect(sendResetLink({ email: "ghost@x.com" })).resolves.toEqual({ ok: true, cooldownSeconds: 60 });
    expect(token.issueSelfServiceResetToken).not.toHaveBeenCalled();
    expect(email.sendResetLinkEmail).not.toHaveBeenCalled();
  });

  it("swallows email failures and still returns ok", async () => {
    repo.findUserByEmail.mockResolvedValue({ userId: 1, status: "ACTIVE" });
    token.issueSelfServiceResetToken.mockResolvedValue("tok123");
    email.sendResetLinkEmail.mockRejectedValue(new Error("throttled"));
    await expect(sendResetLink({ email: "a@x.com" })).resolves.toEqual({ ok: true, cooldownSeconds: 60 });
  });
});

describe("validateResetToken", () => {
  it("valid:true when token exists", async () => {
    token.readResetToken.mockResolvedValue({ userId: 1, source: "self-service" });
    await expect(validateResetToken("tok")).resolves.toEqual({ valid: true });
  });
  it("valid:false when token missing", async () => {
    token.readResetToken.mockResolvedValue(null);
    await expect(validateResetToken("nope")).resolves.toEqual({ valid: false });
  });
});

describe("resetPassword", () => {
  const input = { token: "tok123", encryptedPassword: "enc" };

  it("rejects an invalid/expired token", async () => {
    token.readResetToken.mockResolvedValue(null);
    await expect(resetPassword(input)).rejects.toMatchObject({ code: ERR_FP_TOKEN_INVALID });
    expect(repo.updatePassword).not.toHaveBeenCalled();
  });

  it("rejects a reused password", async () => {
    token.readResetToken.mockResolvedValue({ userId: 1, source: "self-service" });
    repo.findUserById.mockResolvedValue({ userId: 1, status: "ACTIVE", passwordHash: "old", passwordHistory: [] });
    pwInput.decryptAndValidatePassword.mockResolvedValue("NewPassw0rd!");
    security.verifyPassword.mockResolvedValue(true);
    await expect(resetPassword(input)).rejects.toMatchObject({ code: ERR_FP_PASSWORD_REUSED });
    expect(repo.updatePassword).not.toHaveBeenCalled();
  });

  it("updates password + history and consumes the token on success", async () => {
    token.readResetToken.mockResolvedValue({ userId: 1, source: "self-service" });
    repo.findUserById.mockResolvedValue({ userId: 1, status: "ACTIVE", passwordHash: "old", passwordHistory: ["h1"] });
    pwInput.decryptAndValidatePassword.mockResolvedValue("NewPassw0rd!");
    security.verifyPassword.mockResolvedValue(false);
    security.hashPassword.mockResolvedValue("newhash");

    await expect(resetPassword(input)).resolves.toEqual({ ok: true });
    expect(repo.updatePassword).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ passwordHash: "newhash", passwordHistory: ["old", "h1"] }),
    );
    expect(token.consumeResetToken).toHaveBeenCalledWith("tok123");
  });
});
