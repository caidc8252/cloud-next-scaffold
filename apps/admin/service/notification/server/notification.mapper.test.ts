// notification.mapper.test.ts
import { expect, it } from "vitest";
import { toNotice } from "./notification.mapper";

it("maps SysNotice row to Notice VO with non-null belongToPartyId", () => {
  const row = {
    noticeId: "n1", userId: 1, belongToPartyId: 100, noticeType: "ticket.assigned",
    title: "A ticket", payload: { summary: "s" }, status: "UNREAD",
    creTime: new Date("2026-06-14T00:00:00.000Z"), updTime: new Date(),
  };
  const notice = toNotice(row as never);
  expect(notice).toEqual({
    id: "n1", type: "ticket.assigned", title: "A ticket", status: "UNREAD",
    createdAt: "2026-06-14T00:00:00.000Z", payload: { summary: "s" },
    belongToPartyId: 100,
  });
  expect(notice.belongToPartyId).toBe(100);
});

it("maps SysNotice row to Notice VO with null belongToPartyId (system notice)", () => {
  const row = {
    noticeId: "n2", userId: 1, belongToPartyId: null, noticeType: "account.passwordReset",
    title: "Your password was reset", payload: { summary: "An admin reset your password" }, status: "UNREAD",
    creTime: new Date("2026-06-14T00:00:00.000Z"), updTime: new Date(),
  };
  const notice = toNotice(row as never);
  expect(notice.belongToPartyId).toBeNull();
  expect(notice.id).toBe("n2");
});
