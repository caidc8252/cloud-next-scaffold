import { NextResponse } from "next/server";
import { consumeSessionHandoffToken } from "@cloud/permissions/server";
import { getConfig } from "@cloud/config";
import { PORTAL_ROUTE } from "@cloud/constants";

// 消费 portal 签发的一次性会话交接 token，在 customer 自己的 host 下写 host-only sid cookie（会话架构方案 B）。
// 与 admin 的同名端点同构；token 失效/缺失 → 回 portal 登录页。
function portalLoginUrl(): string {
  return new URL(PORTAL_ROUTE.login, getConfig().NEXT_PORTAL_URL).toString();
}

export async function GET(req: Request): Promise<NextResponse> {
  const token = new URL(req.url).searchParams.get("token");
  const accepted = token ? await consumeSessionHandoffToken(token) : false;
  return new NextResponse(null, {
    status: 303,
    headers: { Location: accepted ? "/" : portalLoginUrl() },
  });
}
