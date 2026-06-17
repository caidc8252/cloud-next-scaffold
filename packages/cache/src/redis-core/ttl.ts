// 所有 Redis 键存活时长的唯一策略表（秒，单位进名）。审计入口：一处看全所有键的有效期。
// 注意：仅限「Redis key 的 EXPIRE 时长」；DB 背书的业务有效期（如邀请 INVITE_TTL_MS，毫秒）
// 属业务常量，放 @cloud/constants，不在此。
// 命名与 REDIS_NS 同源：变量名以业务域为前缀（AUTH_…），与对应 key 一一对照。
export const TTL = {
  AUTH_SESSION_SECONDS: 1800, // 30m，命中滑动续期
  AUTH_SESSION_HANDOFF_SECONDS: 60, // 跨 host 一次性交接票据
  AUTH_LOGIN_MFA_SECONDS: 300, // 5m，密码已过、MFA 未过的短期票据
  AUTH_LOGIN_NONCE_SECONDS: 130, // 略大于登录时间戳窗
  AUTH_PW_RESET_SELF_SECONDS: 60 * 60, // 自助找回 1h
  AUTH_PW_RESET_ADMIN_SECONDS: 72 * 60 * 60, // 管理员代发 72h（同 pwreset keyspace，按 source 选）
  AUTH_VERIFY_CODE_SECONDS: 600, // 改邮箱验证码 10m
} as const;
