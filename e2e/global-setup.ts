// next-kit:e2e-bootstrap v7
//
// 用真实浏览器走 web 登录页（应用自身完成 RSA 加密 + 跨 host handoff），
// storageState 落 admin 会话。避免在 Node 里重写 RSA/handoff。
import { chromium, type FullConfig } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const REQUIRED = [
  "E2E_BASE_URL",
  "E2E_ADMIN_EMAIL",
  "E2E_ADMIN_PASSWORD",
  "E2E_CAPTCHA_BYPASS_TOKEN",
  "DATABASE_URL",
  "REDIS_URL",
] as const;

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`global-setup: missing env: ${missing.join(", ")}`);

  const webUrl = process.env.E2E_BASE_URL!;
  await mkdir("e2e/.auth", { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    extraHTTPHeaders: { "X-E2E-Bypass-Captcha": process.env.E2E_CAPTCHA_BYPASS_TOKEN! },
  });
  const page = await ctx.newPage();
  try {
    // web 登录页：应用自身做 login-challenge + RSA 加密 + POST /api/auth/password，
    // 成功后 handoff 跨域跳 admin console（ADMIN 组）。
    await page.goto(`${webUrl}/login`);
    await page.fill("#login-email", process.env.E2E_ADMIN_EMAIL!);
    await page.fill("#login-password", process.env.E2E_ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Sign in" }).click();
    // 等到落 admin host（handoff 完成、admin sid 已写）。
    await page.waitForURL((url) => url.origin === webUrl, { timeout: 30_000 });
    await ctx.storageState({ path: "e2e/.auth/admin.json" });
  } finally {
    await browser.close();
  }
}
