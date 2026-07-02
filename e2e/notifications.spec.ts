import { expect, test } from "@playwright/test";
import { pool, truncateAll } from "./fixtures/db";

type ApiResponse<T> = {
  code: string;
  data: T;
};

type Notice = {
  id: string;
  status: "UNREAD" | "READ";
  title: string | null;
};

const ADMIN_USER_ID = 1;
const PLATFORM_PARTY_ID = 1;
const NOTICE_ID = "e2e-notice-1";

test.beforeEach(async () => {
  await truncateAll();
  await pool.query(
    `INSERT INTO sys_notice
      (notice_id, user_id, belong_to_party_id, notice_type, title, payload, status, cre_time, upd_time)
     VALUES
      ($1, $2, $3, $4, $5, $6::jsonb, 'UNREAD', NOW(), NOW())`,
    [
      NOTICE_ID,
      ADMIN_USER_ID,
      PLATFORM_PARTY_ID,
      "account.e2e",
      "E2E notice",
      JSON.stringify({ summary: "E2E summary", detail: "E2E detail" }),
    ],
  );
});

test("authenticated user can list notification counts and mark a notice read", async ({ request }) => {
  const list = await request.get("/api/notifications");
  expect(list.ok()).toBeTruthy();
  const listJson = (await list.json()) as ApiResponse<{ items: Notice[] }>;
  expect(listJson.data.items).toHaveLength(1);
  expect(listJson.data.items[0]).toMatchObject({
    id: NOTICE_ID,
    status: "UNREAD",
    title: "E2E notice",
  });

  const unreadCount = await request.get("/api/notifications/unread-count");
  expect(unreadCount.ok()).toBeTruthy();
  await expect(unreadCount.json()).resolves.toMatchObject({
    code: "OK",
    data: { count: 1 },
  });

  const unreadByParty = await request.get("/api/notifications/unread-by-party");
  expect(unreadByParty.ok()).toBeTruthy();
  await expect(unreadByParty.json()).resolves.toMatchObject({
    code: "OK",
    data: { counts: { [PLATFORM_PARTY_ID]: 1 } },
  });

  const markRead = await request.post("/api/notifications/read", {
    data: { ids: [NOTICE_ID] },
  });
  expect(markRead.ok()).toBeTruthy();
  await expect(markRead.json()).resolves.toMatchObject({
    code: "OK",
    data: { updated: 1 },
  });

  const unreadCountAfterRead = await request.get("/api/notifications/unread-count");
  expect(unreadCountAfterRead.ok()).toBeTruthy();
  await expect(unreadCountAfterRead.json()).resolves.toMatchObject({
    data: { count: 0 },
  });
});
