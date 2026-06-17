// Redis 命名空间唯一分配表，按业务域分组。规则：每个值 = "<域>:<名>"，第一段恒为业务域，
// 全小写、`:` 分隔域与名、**段内多词用 snake_case（下划线，不用连字符）** → 跨域天然不撞；
// 新增 key 进对应域子对象即可（撞名 / 格式由 namespace.test 兜底）。
// 登录/权限/会话统一挂 auth:。注意：这些是规范化后的前缀，与历史键（session: / pwreset:
// / AUTH:LOGIN-MFA: 等）不同，首次部署后历史 Redis 键将失配（见 PR 说明）。
export const REDIS_NS = {
  auth: {
    session: "auth:session",
    sessionHandoff: "auth:session_handoff",
    loginMfa: "auth:login_mfa",
    loginNonce: "auth:login_nonce",
    pwReset: "auth:pw_reset",
    verify: "auth:verify",
  },
} as const;
