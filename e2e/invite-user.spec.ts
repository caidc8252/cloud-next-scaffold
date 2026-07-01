import { test, expect } from "@playwright/test";
import { truncateAll, pool } from "./fixtures/db";

const ADMIN_URL = process.env.E2E_BASE_URL!;
const PLATFORM_PARTY_ID = 1; // seed 的 ACTIVE Platform party
const PASSWORD = "E2ePass!2026xyz"; // 12+ 且四类，满足密码策略

test.beforeEach(async () => {
  await truncateAll(); // 清非 KEEP 表（含 sys_operator_invite）；保留 admin/party/role
});

test("admin 邀请 → 被邀人注册入驻为 NORMAL，party 不激活，邀请 CONSUMED", async ({ browser }) => {
  const inviteEmail = `invitee-${Date.now()}@e2e.test`;

  // 1) admin 会话调 createInvite（场景一：邀进 admin 的 Platform party）。
  const adminCtx = await browser.newContext({ storageState: "e2e/.auth/admin.json" });
  const created = await adminCtx.request.post(`${ADMIN_URL}/api/system/users`, {
    data: { email: inviteEmail, roleIds: [] },
  });
  expect(created.ok()).toBeTruthy();
  const token = (await created.json()).data.inviteToken as string;
  expect(token).toBeTruthy();
  await adminCtx.close();

  // 2) 匿名上下文走 web 接受（注册新账号）。
  const anon = await browser.newContext();
  const page = await anon.newPage();
  await page.goto(`${ADMIN_URL}/onboarding?token=${encodeURIComponent(token)}`);
  await page.getByRole("button", { name: "Register a new account" }).click();
  await page.fill("#ob-display", "E2E Invitee");
  await page.fill("#ob-pw", PASSWORD);
  await page.fill("#ob-confirm", PASSWORD); // country 默认 US，无需操作
  await page.getByRole("button", { name: "Create account & join" }).click();
  // 新用户恰好 1 party → handoff 进 console（落 admin:3000）。
  await page.waitForURL((url) => url.origin === ADMIN_URL, { timeout: 30_000 });
  await anon.close();

  // 3) 读库断言（裸 pg）。
  const u = await pool.query<{ user_id: number; status: string }>(
    `SELECT user_id, status FROM sys_user WHERE email = $1`,
    [inviteEmail],
  );
  expect(u.rowCount).toBe(1);
  expect(u.rows[0].status).toBe("ACTIVE");

  const link = await pool.query<{ authorizing_type: string; status: string }>(
    `SELECT authorizing_type, status FROM sys_party_user WHERE party_id = $1 AND user_id = $2`,
    [PLATFORM_PARTY_ID, u.rows[0].user_id],
  );
  expect(link.rowCount).toBe(1);
  expect(link.rows[0].authorizing_type).toBe("NORMAL"); // CONF-1
  expect(link.rows[0].status).toBe("ACTIVE");

  const party = await pool.query<{ status: string }>(
    `SELECT status FROM sys_party WHERE party_id = $1`,
    [PLATFORM_PARTY_ID],
  );
  expect(party.rows[0].status).toBe("ACTIVE"); // 未被激活流程触碰

  const inv = await pool.query<{ status: string }>(
    `SELECT status FROM sys_operator_invite WHERE token = $1`,
    [token],
  );
  expect(inv.rows[0].status).toBe("CONSUMED");
});
