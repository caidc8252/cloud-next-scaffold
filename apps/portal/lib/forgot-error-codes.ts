// Platform 1, Module 05 = Portal forgot-password（忘记密码/找回）。
export const ERR_FP_CODE_INVALID = "105001"; // 验证码错误/过期（含邮箱不存在，归一防枚举）
export const ERR_FP_PASSWORD_WEAK = "105002"; // 新密码不满足复杂度
export const ERR_FP_PASSWORD_REUSED = "105003"; // 新密码与近期历史重复
