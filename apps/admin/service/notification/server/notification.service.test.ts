// notification.service.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActiveSession } from "@cloud/permissions/server";

vi.mock("./notification.repository", () => ({
  scopeWhere: vi.fn(), unreadWhere: vi.fn(),
  listScoped: vi.fn(), countUnread: vi.fn(), findByIdScoped: vi.fn(),
  markReadByIds: vi.fn(), markAllRead: vi.fn(), create: vi.fn(),
  unreadCountByParty: vi.fn(),
}));

import * as repo from "./notification.repository";
import { listNotices, unreadCount, unreadCountByParty, markRead, createNotice } from "./notification.service";

const session = { userId: 7, currentPartyId: 100, partyName: "P", permissions: [] } as unknown as ActiveSession;
const row = (id: string) => ({
  noticeId: id, userId: 7, belongToPartyId: 100, noticeType: "ticket.assigned",
  title: "T", payload: { summary: "s" }, status: "UNREAD",
  creTime: new Date("2026-06-14T00:00:00.000Z"), updTime: new Date(),
});

beforeEach(() => vi.resetAllMocks());

describe("listNotices", () => {
  it("returns mapped items + offset pager", async () => {
    vi.mocked(repo.listScoped).mockResolvedValue({ rows: [row("a")], total: 30 } as never);
    const { items, pager } = await listNotices(session, { page: 2, limit: 25 });
    expect(repo.listScoped).toHaveBeenCalledWith({ userId: 7, partyId: 100 }, expect.objectContaining({ skip: 25, take: 25 }));
    expect(items[0].id).toBe("a");
    expect(pager).toEqual({ page: 2, limit: 25, total: 30, totalPages: 2 });
  });
});

describe("markRead", () => {
  it("delegates all:true to markAllRead", async () => {
    vi.mocked(repo.markAllRead).mockResolvedValue(3 as never);
    expect(await markRead(session, { all: true })).toBe(3);
    expect(repo.markAllRead).toHaveBeenCalledWith({ userId: 7, partyId: 100 });
  });
  it("delegates ids to markReadByIds (scoped → foreign id can't match)", async () => {
    vi.mocked(repo.markReadByIds).mockResolvedValue(1 as never);
    expect(await markRead(session, { ids: ["a", "x"] })).toBe(1);
    expect(repo.markReadByIds).toHaveBeenCalledWith({ userId: 7, partyId: 100 }, ["a", "x"]);
  });
});

describe("unreadCount", () => {
  it("counts via repo", async () => {
    vi.mocked(repo.countUnread).mockResolvedValue(5 as never);
    expect(await unreadCount(session)).toBe(5);
  });
});

describe("unreadCountByParty", () => {
  it("delegates to repo using session.userId and returns counts map", async () => {
    vi.mocked(repo.unreadCountByParty).mockResolvedValue({ 100: 3 } as never);
    const result = await unreadCountByParty(session);
    expect(repo.unreadCountByParty).toHaveBeenCalledWith(session.userId);
    expect(result).toEqual({ 100: 3 });
  });
});

describe("createNotice", () => {
  it("validates and writes UNREAD with null party default", async () => {
    vi.mocked(repo.create).mockResolvedValue(row("c") as never);
    await createNotice({ userId: 9, noticeType: "account.passwordReset", title: "T", payload: { summary: "s", detail: "d" } });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 9, belongToPartyId: null, noticeType: "account.passwordReset", title: "T",
    }));
  });
  it("rejects payload without summary or detail", async () => {
    await expect(createNotice({ userId: 9, noticeType: "t.x", title: "T", payload: {} } as never)).rejects.toBeTruthy();
    await expect(createNotice({ userId: 9, noticeType: "t.x", title: "T", payload: { summary: "s" } } as never)).rejects.toBeTruthy();
  });
});
