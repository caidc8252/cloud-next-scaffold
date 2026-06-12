// Platform 1, Module 00 = Common
export const ERR_BAD_REQUEST = "100001";
export const ERR_UNAUTHORIZED = "100002";
export const ERR_FORBIDDEN = "100003";
export const ERR_NOT_FOUND = "100004";
export const ERR_INTERNAL = "100005";
export const ERR_INVALID_JSON = "100006";
export const ERR_INVALID_ID = "100007";
export const ERR_TOO_MANY_REQUESTS = "100008"; // 操作过于频繁（429 语义；如收件人邮件节流）

// Platform 1, Module 01 = Users
export const ERR_USER_EMAIL_INVALID = "101001";
export const ERR_USER_EMAIL_TAKEN = "101002";
export const ERR_USER_NOT_FOUND = "101003";
export const ERR_USER_RESET_PW_PENDING = "101005";
export const ERR_USER_NO_PENDING_INVITE = "101006";
export const ERR_USER_CANCEL_NOT_PENDING = "101007";
export const ERR_USER_PROTECTED = "101008";
export const ERR_USER_CANNOT_DISABLE_SELF = "101009";

// Platform 1, Module 02 = Roles
export const ERR_ROLE_NOT_FOUND = "102001";
export const ERR_ROLE_NAME_SHORT = "102002";
export const ERR_ROLE_DELETE_BUILTIN = "102003";
export const ERR_ROLE_DELETE_ASSIGNED = "102004";

// Platform 1, Module 90 = Middleware / Infra
// 中间件类故障:对外统一 5xx + 同一句通用文案,客户看不出哪挂了;
// 开发凭 code + traceId 在日志里快速识别是 DB / Redis / 邮件。
export const ERR_MW_DB = "190001"; // 数据库:连接 / 超时等基础设施级(非业务约束冲突)
export const ERR_MW_CACHE = "190002"; // 缓存 / Redis
export const ERR_MW_MAIL = "190003"; // 邮件发送
export const ERR_MW_UNKNOWN = "190009"; // 未归类中间件
