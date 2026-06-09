import { NextResponse } from "next/server";
import { destroySession } from "@cloud/permissions/server";
import { withApiHandler } from "@/lib/api-handler";
import { getSiteLoginUrl } from "@/lib/site-routing";

function redirectToLogin() {
  // 登出发生在 web，但重新登录始终回到 site，保证登录入口只有一套。
  return new NextResponse(null, {
    status: 303,
    headers: { Location: getSiteLoginUrl() },
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
