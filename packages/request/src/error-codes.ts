// Error code format: 5-hex-digit IISSS (II = module id, SSS = per-module sequence).
// Module 00 = @cloud/request shared/common codes.
export const ERR_BAD_REQUEST = "00001";
export const ERR_UNAUTHORIZED = "00002";
export const ERR_FORBIDDEN = "00003";
export const ERR_NOT_FOUND = "00004";
export const ERR_INTERNAL = "00005";
export const ERR_INVALID_JSON = "00006";
export const ERR_INVALID_ID = "00007";
export const ERR_TOO_MANY_REQUESTS = "00008"; // 操作过于频繁（429 语义；如收件人邮件节流）

// Module F0 = Middleware / Infra.
// 中间件类故障:对外统一 5xx + 同一句通用文案,客户看不出哪挂了;
// 开发凭 code + traceId 在日志里快速识别是 DB / Redis / 邮件。
export const ERR_MW_DB = "F0001"; // 数据库:连接 / 超时等基础设施级(非业务约束冲突)
export const ERR_MW_CACHE = "F0002"; // 缓存 / Redis
export const ERR_MW_MAIL = "F0003"; // 邮件发送
export const ERR_MW_UNKNOWN = "F0009"; // 未归类中间件
