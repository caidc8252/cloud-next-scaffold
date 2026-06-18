// 被其他 app 互链的跨 app 路由路径（跨 app 契约：改路由这里同步改）。
// app 基址（含本地兜底）解析收口在 @cloud/config 的 resolveAppUrl / getConfig。

/** portal 对外暴露、被其他 app 拼链接的路由。 */
export const PORTAL_ROUTE = {
  login: "/login",
  selectPartner: "/select-partner",
  onboarding: "/onboarding",
  resetPassword: "/reset-password",
} as const;

/** 各 console（admin/customer/…）统一的会话 handoff 入口（会话架构方案 B）。 */
export const CONSOLE_ROUTE = {
  sessionHandoff: "/api/auth/session-handoff",
} as const;
