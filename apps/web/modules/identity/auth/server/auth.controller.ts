import { NextResponse } from "next/server";
import {
  destroySession,
  consumeSessionHandoffToken,
  getPartialSession,
} from "@cloud/permissions/server";
import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_AUTH_PARTNER_REQUIRED, ERR_AUTH_NOT_AUTHENTICATED } from "@/lib/auth-error-codes";
import { getPortalLoginUrl } from "@/lib/portal-routing";
import { withApiHandler } from "@/lib/api-handler";
import { selectPartnerSchema } from "../schema/auth.schema";
import { selectPartner as selectPartnerSvc } from "./auth.service";

// /api/auth/* 后台侧端点。登录入口统一在 portal,故登出/交接失败一律 303 回 portal 登录页。

function redirectResponse(location: string) {
  return new NextResponse(null, { status: 303, headers: { Location: location } });
}

/** 登出(GET/POST 同义):销毁会话并回到 portal 登录页(登录入口只有一套)。 */
export const logout = withApiHandler(async () => {
  await destroySession();
  return redirectResponse(getPortalLoginUrl());
});

/** 公开端点:返回服务端当前时间戳(epoch ms),供前端登录前打包加密用。无副作用、无鉴权。 */
export const serverTime = withApiHandler(async () => {
  return successResponse({ serverTimestamp: Date.now() });
});

/**
 * 消费 portal 签发的短期会话交接 token,并在当前 host 下写入 sid(适配 Codespaces 端口子域,
 * 避免把 cookie domain 放大到整个 app.github.dev)。
 */
export const sessionHandoff = withApiHandler(async (req: Request) => {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return redirectResponse(getPortalLoginUrl());
  const accepted = await consumeSessionHandoffToken(token);
  return redirectResponse(accepted ? "/" : getPortalLoginUrl());
});

/**
 * 为 partial(登录后、选 party 前)会话选择当前公司并升级为完整会话。
 *
 * @e2e-cell feature=auth kind=auth-boundary
 */
export const selectPartner = withApiHandler(async (req: Request) => {
  const partial = await getPartialSession();
  if (!partial) throw new BusinessError(ERR_AUTH_NOT_AUTHENTICATED, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new BusinessError(ERR_AUTH_PARTNER_REQUIRED);
  }

  const parsed = selectPartnerSchema.safeParse(body);
  if (!parsed.success) throw new BusinessError(ERR_AUTH_PARTNER_REQUIRED);

  return successResponse(await selectPartnerSvc(partial.userId, parsed.data.partyId));
});
