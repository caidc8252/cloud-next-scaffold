import "server-only";

import type { PortalGroup } from "@cloud/platform-config";

// 各 portal 组的 console 基址属部署配置，留 app env。merchant app 暂未建（无默认）。
const DEFAULT_URL: Record<PortalGroup, string | undefined> = {
  ADMIN: "http://localhost:3000",
  CUSTOMER: "http://localhost:3200",
  MERCHANT: undefined,
};
const ENV_KEY: Record<PortalGroup, string> = {
  ADMIN: "ADMIN_APP_URL",
  CUSTOMER: "CUSTOMER_APP_URL",
  MERCHANT: "MERCHANT_APP_URL",
};

function parseUrl(value: string, key: string): URL {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${key} must use http or https.`);
  }
  return url;
}

/** 某 portal 组的 console 基址（env 优先，否则默认；都没有 → 抛错，如 merchant 未配置）。 */
export function appUrlForGroup(group: PortalGroup): string {
  const value = process.env[ENV_KEY[group]]?.trim() || DEFAULT_URL[group];
  if (!value) throw new Error(`${ENV_KEY[group]} is not configured (no app for ${group} portal group).`);
  return parseUrl(value, ENV_KEY[group]).toString();
}

// 登录 / 选 Party 收尾的「落地 URL」唯一入口（会话架构方案 B：泛化 handoff）。
// B：一次性 token 走 URL → 目标 console 的 /api/auth/session-handoff 校验后在自己 host 写 host-only sid cookie。
// 将来快切 A（共享父域直跳）：把本函数改成 `return appUrlForGroup(group)`，并给 sid cookie 配 Domain=父域
//（cookie options 在 @cloud/permissions）。切换点收口在此一处 + 那处 cookie 配置，业务调用方不动。
export function entryUrlForParty(group: PortalGroup, handoffToken: string): string {
  const url = new URL(appUrlForGroup(group));
  url.pathname = "/api/auth/session-handoff";
  url.search = "";
  url.searchParams.set("token", handoffToken);
  return url.toString();
}
