// Next.js 启动钩子：导入 @/manifest 触发 createPlatformConfig 的构造期校验
// （聚合全部 app manifest + 完整性校验）。任何非法 manifest
// 会在此抛错、拒绝启动。无注册表、无导入副作用，仅这一处做启动期早校验。
export async function register() {
  await import("@/manifest");
}
