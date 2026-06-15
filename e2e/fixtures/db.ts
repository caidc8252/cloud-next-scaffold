// Truncate-between for e2e, via a raw `pg` client — NOT the Prisma client.
// Playwright's transform can't load the Prisma 7 ESM client. DATABASE_URL (from
// .env.test, loaded in playwright.config.ts) must point at the test Postgres.
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 保留 seed 的身份/RBAC 表（admin 账号 + Platform party + 角色绑定 + 契约），
// 否则首次 truncate 清掉登录账号与待邀 party。被保留表内的行不清理：
// 本 tracer 只新增唯一邮箱的邀请/用户并断言自己的行。
const KEEP: readonly string[] = [
  "sys_user",
  "sys_party",
  "sys_party_user",
  "sys_party_contract",
  "sys_role",
];

export async function truncateAll(opts: { keep?: readonly string[] } = {}): Promise<void> {
  const keep = new Set<string>(["_prisma_migrations", ...KEEP, ...(opts.keep ?? [])]);
  const { rows } = await pool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  const list = rows
    .filter((r) => !keep.has(r.tablename))
    .map((r) => `"public"."${r.tablename}"`)
    .join(", ");
  if (!list) return;
  await pool.query(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

export { pool };
