import "server-only";

const DEFAULT_WEB_APP_URL = "http://localhost:3000";

function parseWebAppUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("WEB_APP_URL must use http or https.");
  }
  return url;
}

// 跳转目标属于部署配置，留在 app env 中；site 只负责登录与选 partner，
// 真正进入哪个平台由 WEB_APP_URL 决定。
export function getWebAppUrl(): string {
  const configured = process.env.WEB_APP_URL?.trim();
  return parseWebAppUrl(configured || DEFAULT_WEB_APP_URL).toString();
}
