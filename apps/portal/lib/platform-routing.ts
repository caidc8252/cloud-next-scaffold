import "server-only";

import { resolveAppUrl } from "@cloud/config";
import { CONSOLE_ROUTE } from "@cloud/constants";
import type { PortalGroup } from "@cloud/platform-config";

// 各 portal 组 → 对应 console 的 (env key, 本地 dev 兜底)。基址解析（显式/兜底/生产硬抛/协议校验）
// 收口在 @cloud/config 的 resolveAppUrl。MERCHANT app 未建（无兜底，缺值即抛）。
const GROUP_APP: Record<PortalGroup, { envKey: string; devFallback?: string }> = {
  ADMIN: { envKey: "NEXT_ADMIN_URL", devFallback: "http://127.0.0.1:3000" },
  CUSTOMER: { envKey: "NEXT_CUSTOMER_URL", devFallback: "http://127.0.0.1:3200" },
  MERCHANT: { envKey: "NEXT_MERCHANT_URL" },
};

/** 某 portal 组的 console 基址（解析规则见 resolveAppUrl）。 */
export function appUrlForGroup(group: PortalGroup): string {
  const { envKey, devFallback } = GROUP_APP[group];
  return resolveAppUrl(envKey, devFallback);
}

// 登录 / 选 Party 收尾的「落地 URL」唯一入口（会话架构方案 B：泛化 handoff）。
// B：一次性 token 走 URL → 目标 console 的 /api/auth/session-handoff 校验后在自己 host 写 host-only sid cookie。
// 将来快切 A（共享父域直跳）：把本函数改成 `return appUrlForGroup(group)`，并给 sid cookie 配 Domain=父域
//（cookie options 在 @cloud/permissions）。切换点收口在此一处 + 那处 cookie 配置，业务调用方不动。
export function entryUrlForParty(group: PortalGroup, handoffToken: string): string {
  const url = new URL(appUrlForGroup(group));
  url.pathname = CONSOLE_ROUTE.sessionHandoff;
  url.search = "";
  url.searchParams.set("token", handoffToken);
  return url.toString();
}
