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
