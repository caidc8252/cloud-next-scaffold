// next-kit:e2e-bootstrap v7
import { defineConfig } from "@playwright/test";
import { config } from "dotenv";

// 先把 .env.test 灌进 process.env：webServer 子进程与 global-setup 都据此连
// e2e 的 Postgres/Redis（而非 dev 库）。
config({ path: ".env.test" });

const ADMIN_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const PORTAL_URL = process.env.E2E_PORTAL_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "e2e",
  workers: 1, // the truncate-between fixture is not parallel-safe
  globalSetup: "./e2e/global-setup.ts",
  reporter: [["html"], ["json", { outputFile: ".e2e/raw.json" }]],
  // admin(under test) + portal(login/onboarding) 同时在线；二者继承 .env.test 的
  // DATABASE_URL/REDIS_URL（经上面的 dotenv 进 process.env，webServer.env 透传）。
  webServer: [
    {
      command: "pnpm -F admin dev",
      url: ADMIN_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: { ...process.env },
    },
    {
      command: "pnpm -F portal dev",
      url: PORTAL_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: { ...process.env },
    },
  ],
  use: {
    baseURL: ADMIN_URL,
    extraHTTPHeaders: {
      "X-E2E-Bypass-Captcha": process.env.E2E_CAPTCHA_BYPASS_TOKEN ?? "",
    },
  },
  projects: [{ name: "anon", use: {} }],
});
