import { NextResponse } from "next/server";
import { consumeSessionHandoffToken } from "@cloud/permissions/server";
import { withApiHandler } from "@/lib/api-handler";
import { getPortalLoginUrl } from "@/lib/portal-routing";

function redirectResponse(location: string) {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: location },
  });
}

/**
 * 消费 portal 签发的短期会话交接 token，并在 admin 当前 host 下写入 sid。
 * 这样 Codespaces 的端口子域可以正常登录，同时避免把 cookie domain 放大到
 * 整个 app.github.dev 公共开发域。
 */
export const GET = withApiHandler(async (req: Request) => {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return redirectResponse(getPortalLoginUrl());

  const accepted = await consumeSessionHandoffToken(token);
  return redirectResponse(accepted ? "/" : getPortalLoginUrl());
});
