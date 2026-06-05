import { describe, expect, it } from "vitest";
import { toClientUser } from "./user-mapper";

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    userId: 1,
    username: "alice",
    nickName: "Alice",
    email: "alice@example.com",
    country: "US",
    status: "ACTIVE",
    lastLoginAt: null,
    passwordChangedTimestamp: null,
    passwordErrorTimes: 0,
    passwordErrorLockExpiredTimestamp: null,
    creTime: new Date("2026-01-01T00:00:00.000Z"),
    updTime: new Date("2026-01-02T00:00:00.000Z"),
    partnerUsers: [
      { authorizingType: "NORMAL", status: "ACTIVE", roles: [{ roleId: 7 }], remark: "EMEA ops" },
    ],
    ...overrides,
  } as Parameters<typeof toClientUser>[0];
}

describe("toClientUser remark source", () => {
  it("reads remark from the partner-user relationship", () => {
    expect(toClientUser(baseRow()).remark).toBe("EMEA ops");
  });

  it("falls back to empty string when the relationship has no remark", () => {
    const row = baseRow({
      partnerUsers: [{ authorizingType: "NORMAL", status: "ACTIVE", roles: [], remark: null }],
    });
    expect(toClientUser(row).remark).toBe("");
  });
});
