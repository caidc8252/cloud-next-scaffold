import { NextResponse } from "next/server";
import { destroySession } from "@cloud/permissions/server";
import { withApiHandler } from "@/lib/api-handler";

// 用相对 Location 重定向，避免在 Codespace / 反向代理环境下被 request.url
// 里的内部绑定地址（localhost:3000）写死成错误的跳转 host。
// 浏览器会基于实际访问的 origin 解析相对路径。303 让登出后以 GET 打开 /login。
function redirectToLogin() {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: "/login" },
  });
}

export const GET = withApiHandler(async () => {
  await destroySession();
  return redirectToLogin();
})

export const POST = withApiHandler(async () => {
  await destroySession();
  return redirectToLogin();
})
