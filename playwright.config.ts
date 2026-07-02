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

export default defineConfig({
  testDir: "e2e",
  workers: 1, // the truncate-between fixture is not parallel-safe
  globalSetup: "./e2e/global-setup.ts",
  reporter: [["html"], ["json", { outputFile: ".e2e/raw.json" }]],
  // web (单应用) 包含 admin console + portal 公开页（登录/注册/忘记密码）；
  // 就绪探测用 /api/health（200），避免 / 的重定向链导致超时。
  webServer: [
    {
      command: "pnpm -F web dev",
      url: `${ADMIN_URL}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: { ...process.env },
    },
  ],
  use: {
    baseURL: ADMIN_URL,
  },
  projects: [{ name: "anon", use: {} }],
});
