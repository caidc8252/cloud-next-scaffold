import { describe, expect, it } from "vitest";
import { toClientUser, parseRoleIds } from "./user-mapper";

describe("parseRoleIds", () => {
  it("parses string ids to deduped, ascending numbers", () => {
    expect(parseRoleIds(["3", "1", "3", "2"])).toEqual([1, 2, 3]);
  });

  it("drops non-finite values and returns [] for non-arrays", () => {
    expect(parseRoleIds(["1", "abc", null, 2])).toEqual([1, 2]);
    expect(parseRoleIds(undefined)).toEqual([]);
  });
});

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
