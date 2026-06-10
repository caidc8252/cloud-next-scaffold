import type { Instrumentation } from "next";

// Next.js 启动钩子：导入 @/manifest 触发 createPlatformConfig 的构造期校验
// （聚合全部 app manifest + 完整性校验）。任何非法 manifest
// 会在此抛错、拒绝启动。无注册表、无导入副作用，仅这一处做启动期早校验。
export async function register() {
  await import("@/manifest");
}

// 服务端异常集中观测点。Route Handler 的异常已被 withApiHandler 捕获并自带 traceId，
// 不会冒泡到这里；这里主要兜 RSC / 页面渲染期未捕获的异常——把 digest（= 屏幕上给用户的
// 错误编号）、请求路径和完整堆栈一并落日志，用户报 digest 即可在日志里定位到这条栈。
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const digest = (error as { digest?: string }).digest ?? "-";
  console.error(
    `[onRequestError] [${digest}] ${context.routeType} ${request.method} ${request.path}`,
    error,
  );
};
