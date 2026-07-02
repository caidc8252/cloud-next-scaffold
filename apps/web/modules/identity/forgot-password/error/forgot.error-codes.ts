// Module 15 = identity.forgot-password. Format: 5-hex-digit IISSS.
export const ERR_FP_TOKEN_INVALID = "15001"; // 重置链接无效/过期（含 token 不存在、用户非 ACTIVE，归一防枚举）
export const ERR_FP_PASSWORD_WEAK = "15002"; // 新密码不满足复杂度
export const ERR_FP_PASSWORD_REUSED = "15003"; // 新密码与近期历史重复
