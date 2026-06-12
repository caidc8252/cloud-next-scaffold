import type { ErrorMessages } from "./index.ts";
import {
  ERR_BAD_REQUEST,
  ERR_UNAUTHORIZED,
  ERR_FORBIDDEN,
  ERR_NOT_FOUND,
  ERR_INTERNAL,
  ERR_INVALID_JSON,
  ERR_INVALID_ID,
  ERR_TOO_MANY_REQUESTS,
  ERR_USER_EMAIL_INVALID,
  ERR_USER_EMAIL_TAKEN,
  ERR_USER_NOT_FOUND,
  ERR_USER_RESET_PW_PENDING,
  ERR_USER_NO_PENDING_INVITE,
  ERR_USER_CANCEL_NOT_PENDING,
  ERR_USER_PROTECTED,
  ERR_USER_CANNOT_DISABLE_SELF,
  ERR_ROLE_NOT_FOUND,
  ERR_ROLE_NAME_SHORT,
  ERR_ROLE_DELETE_BUILTIN,
  ERR_ROLE_DELETE_ASSIGNED,
  ERR_ROLE_UPDATE_BUILTIN,
  ERR_MW_DB,
  ERR_MW_CACHE,
  ERR_MW_MAIL,
  ERR_MW_UNKNOWN,
} from "../error-codes.ts";

// 中间件类四码共用同一句通用文案:差异只在 code(给开发/日志),不在文案(给客户)。
const MW_UNAVAILABLE = "服务暂时不可用，请稍后重试。";

export const zhCN: ErrorMessages = {
  // 通用
  [ERR_BAD_REQUEST]: "请求参数有误。",
  [ERR_UNAUTHORIZED]: "未登录或登录已失效。",
  [ERR_FORBIDDEN]: "没有权限执行此操作。",
  [ERR_NOT_FOUND]: "请求的资源不存在。",
  [ERR_INTERNAL]: "服务器内部错误。",
  [ERR_INVALID_JSON]: "请求体不是合法的 JSON。",
  [ERR_INVALID_ID]: "提供的 ID 无效。",
  [ERR_TOO_MANY_REQUESTS]: "操作过于频繁，请稍后再试。",
  // 用户
  [ERR_USER_EMAIL_INVALID]: "请输入有效的邮箱地址。",
  [ERR_USER_EMAIL_TAKEN]: "该邮箱地址已被使用。",
  [ERR_USER_NOT_FOUND]: "用户不存在。",
  [ERR_USER_RESET_PW_PENDING]: "该用户已有待处理的密码重置请求。",
  [ERR_USER_NO_PENDING_INVITE]: "该用户没有待处理的邀请。",
  [ERR_USER_CANCEL_NOT_PENDING]: "只能取消待处理的邀请。",
  [ERR_USER_PROTECTED]: "该用户受保护，无法修改。",
  [ERR_USER_CANNOT_DISABLE_SELF]: "不能停用你自己的账号。",
  // 角色
  [ERR_ROLE_NOT_FOUND]: "角色不存在。",
  [ERR_ROLE_NAME_SHORT]: "角色名称太短。",
  [ERR_ROLE_DELETE_BUILTIN]: "内置角色不可删除。",
  [ERR_ROLE_DELETE_ASSIGNED]: "已分配用户的角色不可删除。",
  [ERR_ROLE_UPDATE_BUILTIN]: "内置角色不可修改。",
  // 中间件 / 基础设施（对客户统一文案，开发凭 code 区分）
  [ERR_MW_DB]: MW_UNAVAILABLE,
  [ERR_MW_CACHE]: MW_UNAVAILABLE,
  [ERR_MW_MAIL]: MW_UNAVAILABLE,
  [ERR_MW_UNKNOWN]: MW_UNAVAILABLE,
};
