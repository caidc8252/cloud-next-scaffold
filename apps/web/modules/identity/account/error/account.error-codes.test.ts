import { describe, expect, it } from "vitest";
import * as codes from "./account.error-codes";

const exportedCodes = Object.fromEntries(Object.entries(codes));

describe("account error codes", () => {
  it("uses 5-hex-digit codes in the identity.account module id range", () => {
    expect(exportedCodes).toEqual({
      ERR_ACCOUNT_NICKNAME_REQUIRED: "13001",
      ERR_ACCOUNT_COUNTRY_INVALID: "13002",
      ERR_ACCOUNT_EMAIL_INVALID: "13003",
      ERR_ACCOUNT_EMAIL_TAKEN: "13004",
      ERR_ACCOUNT_EMAIL_SAME: "13005",
      ERR_ACCOUNT_USERNAME_INVALID: "13006",
      ERR_ACCOUNT_USERNAME_TAKEN: "13007",
      ERR_ACCOUNT_USERNAME_SAME: "13008",
      ERR_ACCOUNT_VERIFY_CODE_INVALID: "13009",
      ERR_ACCOUNT_PASSWORD_CURRENT_WRONG: "1300A",
      ERR_ACCOUNT_PASSWORD_POLICY: "1300B",
      ERR_ACCOUNT_PASSWORD_REUSED: "1300C",
      ERR_ACCOUNT_MFA_STEPUP_REQUIRED: "1300D",
      ERR_ACCOUNT_MFA_STEPUP_INVALID: "1300E",
      ERR_ACCOUNT_MFA_NOT_ENABLED: "1300F",
      ERR_ACCOUNT_MFA_ENROLL_CODE_INVALID: "13010",
      ERR_ACCOUNT_MFA_PENDING_MISSING: "13011",
    });

    for (const code of Object.values(exportedCodes)) {
      expect(code).toMatch(/^[0-9A-F]{5}$/);
      expect(code.startsWith("13")).toBe(true);
    }
  });
});
