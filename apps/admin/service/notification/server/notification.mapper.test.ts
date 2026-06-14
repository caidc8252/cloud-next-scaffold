// notification.mapper.test.ts
import { expect, it } from "vitest";
import { toNotice } from "./notification.mapper";

it("maps SysNotice row to Notice VO", () => {
  const row = {
    noticeId: "n1", userId: 1, belongToPartyId: 100, noticeType: "ticket.assigned",
    title: "A ticket", payload: { summary: "s" }, status: "UNREAD",
    creTime: new Date("2026-06-14T00:00:00.000Z"), updTime: new Date(),
  };
  expect(toNotice(row as never)).toEqual({
    id: "n1", type: "ticket.assigned", title: "A ticket", status: "UNREAD",
    createdAt: "2026-06-14T00:00:00.000Z", payload: { summary: "s" },
  });
});
