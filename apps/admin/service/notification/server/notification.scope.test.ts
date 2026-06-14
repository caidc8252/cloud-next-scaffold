// notification.scope.test.ts
import { describe, expect, it } from "vitest";
import { scopeWhere, unreadWhere } from "./notification.scope";

describe("scopeWhere", () => {
  it("scopes by userId and (party OR null)", () => {
    expect(scopeWhere({ userId: 7, partyId: 100 })).toEqual({
      userId: 7,
      OR: [{ belongToPartyId: 100 }, { belongToPartyId: null }],
    });
  });
});

describe("unreadWhere", () => {
  it("adds status UNREAD to scope", () => {
    expect(unreadWhere({ userId: 7, partyId: 100 })).toEqual({
      userId: 7,
      OR: [{ belongToPartyId: 100 }, { belongToPartyId: null }],
      status: "UNREAD",
    });
  });
});
