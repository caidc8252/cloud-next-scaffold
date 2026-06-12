// Platform 1, Module 05 = Portal 重置密码（自助找回 / 管理员触发的消费端）。
export const ERR_FP_TOKEN_INVALID = "105001"; // 重置链接无效/过期（含 token 不存在、用户非 ACTIVE，归一防枚举）
export const ERR_FP_PASSWORD_WEAK = "105002"; // 新密码不满足复杂度
export const ERR_FP_PASSWORD_REUSED = "105003"; // 新密码与近期历史重复
