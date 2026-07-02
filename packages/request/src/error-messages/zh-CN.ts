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
  // 中间件 / 基础设施（对客户统一文案，开发凭 code 区分）
  [ERR_MW_DB]: MW_UNAVAILABLE,
  [ERR_MW_CACHE]: MW_UNAVAILABLE,
  [ERR_MW_MAIL]: MW_UNAVAILABLE,
  [ERR_MW_UNKNOWN]: MW_UNAVAILABLE,
};
