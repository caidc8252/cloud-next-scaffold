import "server-only";

const DEFAULT_ADMIN_APP_URL = "http://localhost:3000";

function parseAdminAppUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("ADMIN_APP_URL must use http or https.");
  }
  return url;
}

// 跳转目标属于部署配置，留在 app env 中；portal 只负责登录与选 partner，
// 真正进入哪个平台由 ADMIN_APP_URL 决定。
export function getAdminAppUrl(): string {
  const configured = process.env.ADMIN_APP_URL?.trim();
  return parseAdminAppUrl(configured || DEFAULT_ADMIN_APP_URL).toString();
}

// 跨 app 登录跳转统一走 admin 的交接入口，由目标 host 自己写 sid cookie；
// 直接跳 ADMIN_APP_URL 在 Codespaces 这类端口子域环境下会丢 host-only cookie。
export function getAdminSessionHandoffUrl(token: string): string {
  const url = new URL(getAdminAppUrl());
  url.pathname = "/api/auth/session-handoff";
  url.search = "";
  url.searchParams.set("token", token);
  return url.toString();
}
