"use client";

import { useEffect } from "react";
import { setUnauthorizedHandler } from "@cloud/request/client";
import { handleUnauthorized } from "@/lib/session-expiry";

// 把「客户端 API 收到 401 → 会话失效自动登出」的策略注册进 @cloud/request 的钩子。
// 挂在根 layout 一次即可；不渲染任何 UI。
export function UnauthorizedRedirect() {
  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized);
    return () => setUnauthorizedHandler(undefined);
  }, []);

  return null;
}
