// next-kit:e2e-bootstrap v7
import { defineConfig } from "@playwright/test";
import { config } from "dotenv";

// 先把 .env.test 灌进 process.env：webServer 子进程与 global-setup 都据此连
// e2e 的 Postgres/Redis（而非 dev 库）。
config({ path: ".env.test" });

// 本机可能设了 http(s)_proxy（如 127.0.0.1:7897），会把对 localhost 的 webServer 就绪探测、
// 浏览器与 request 都代理走 → 502 / 就绪探测超时。e2e 全程只连 localhost（app + pg + redis），
// 不需要任何代理 → 直接删掉代理变量，确保 Playwright 自身探测与它 spawn 的 dev server 都直连。
for (const k of ["http_proxy", "https_proxy", "HTTP_PROXY", "HTTPS_PROXY", "all_proxy", "ALL_PROXY"]) {
  delete process.env[k];
}
process.env.NO_PROXY = "localhost,127.0.0.1";
process.env.no_proxy = "localhost,127.0.0.1";

const ADMIN_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const PORTAL_URL = process.env.E2E_PORTAL_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "e2e",
  workers: 1, // the truncate-between fixture is not parallel-safe
  globalSetup: "./e2e/global-setup.ts",
  reporter: [["html"], ["json", { outputFile: ".e2e/raw.json" }]],
  // admin(under test) + portal(login/onboarding) 同时在线；二者继承 .env.test 的
  // DATABASE_URL/REDIS_URL（经上面的 dotenv 进 process.env，webServer.env 透传）。
  // 就绪探测指向返回 200 的 URL：admin `/` 是 307→logout 的重定向链（Playwright 跟随后永不达 2xx
  // → 探测超时），改用 admin 的 `/api/health`（200）；portal `/` 直接 200。
  webServer: [
    {
      command: "pnpm -F admin dev",
      url: `${ADMIN_URL}/api/health`,
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
