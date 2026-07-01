import type { Instrumentation } from "next";

// Next.js 启动钩子：预热 @/manifest（CoC 运行时,createCocConfig）。
// 声明合法性的早校验已下沉到 codegen（gen:coc 的 buildRegistry/validateCatalog,
// 有 error 拒写、prebuild/pretest 失败),不再依赖启动期导入抛错。
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
