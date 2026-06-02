// Next.js 启动钩子：导入聚合 barrel，触发各 app manifest 的导入副作用
// （每个 app 的 manifest/index 在导入时自注册 + 完整性校验），任何非法 manifest
// 会在此抛错、拒绝启动。实际注册由各 manifest 的导入副作用完成（见 manifest/index.ts），
// 这里只是把它在启动期提前触发一次做早校验。
export async function register() {
  await import("@/manifest/_generated/apps");
}
