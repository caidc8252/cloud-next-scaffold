import { describe, expect, it } from "vitest";
import * as codes from "./users.error-codes";

const exportedCodes = Object.fromEntries(Object.entries(codes));

describe("users error codes", () => {
  it("uses 5-hex-digit codes in the system.users module id range", () => {
    expect(exportedCodes).toEqual({
      ERR_USER_EMAIL_INVALID: "10001",
      ERR_USER_EMAIL_TAKEN: "10002",
      ERR_USER_NOT_FOUND: "10003",
      ERR_USER_RESET_PW_PENDING: "10004",
      ERR_USER_NO_PENDING_INVITE: "10005",
      ERR_USER_CANCEL_NOT_PENDING: "10006",
      ERR_USER_PROTECTED: "10007",
      ERR_USER_CANNOT_DISABLE_SELF: "10008",
    });

    for (const code of Object.values(exportedCodes)) {
      expect(code).toMatch(/^[0-9A-F]{5}$/);
      expect(code.startsWith("10")).toBe(true);
    }
  });
});
