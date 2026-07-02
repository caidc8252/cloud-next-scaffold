// next-kit:e2e-bootstrap v10
//
// 零注入跑法：global-setup 不打任何认证入口、不写 storageState。DEV_AUTH_BYPASS=1
// 时，服务端按本地 fallback provider 为 localhost 请求构建 DB 派生 session。

const REQUIRED = ["E2E_BASE_URL", "DATABASE_URL", "REDIS_URL", "DEV_AUTH_BYPASS"] as const;

export default async function globalSetup(): Promise<void> {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`global-setup: missing env: ${missing.join(", ")}`);

  if (process.env.DEV_AUTH_BYPASS !== "1") {
    throw new Error("global-setup: DEV_AUTH_BYPASS must be 1 for zero-injection e2e.");
  }
}
