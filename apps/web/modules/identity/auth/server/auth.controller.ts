import { NextResponse } from "next/server";
import { destroySession, consumeSessionHandoffToken } from "@cloud/permissions/server";
import { withApiHandler } from "@/lib/api-handler";

// /api/auth/* 后台侧控制器（logout / session-handoff）。
// 登录入口已统一在本 app（/login），登出一律 303 回本 app 登录页。

function redirectResponse(location: string) {
  return new NextResponse(null, { status: 303, headers: { Location: location } });
}

/** 登出(GET/POST 同义):销毁会话并回到登录页。 */
export const logout = withApiHandler(async () => {
  await destroySession();
  return redirectResponse("/login");
});

/**
 * 消费本 app 签发的短期会话交接 token，并在当前 host 下写入 sid（适配 Codespaces 端口子域，
 * 避免把 cookie domain 放大到整个 app.github.dev）。
 */
export const sessionHandoff = withApiHandler(async (req: Request) => {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return redirectResponse("/login");
  const accepted = await consumeSessionHandoffToken(token);
  return redirectResponse(accepted ? "/" : "/login");
});
