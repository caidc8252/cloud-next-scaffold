// Auth 域错误码（本地，沿用 @cloud/request 的 Platform 1, Module XX 编号）
// Platform 1, Module 03 = Auth
export const ERR_AUTH_MISSING_FIELDS = "103001";
export const ERR_AUTH_INVALID_CREDENTIALS = "103002";
export const ERR_AUTH_ACCOUNT_LOCKED = "103003";
export const ERR_AUTH_NO_ACTIVE_PARTNER = "103004";
export const ERR_AUTH_NOT_AUTHENTICATED = "103005";
export const ERR_AUTH_INVALID_PARTNER = "103006";
// 登录 / 选组织各自的「必填项缺失」专属码，避免共用 ERR_AUTH_MISSING_FIELDS 后
// 文案被本地化收敛成同一句（这两处都是用户可见页面，文案需各自具体）。
export const ERR_AUTH_CREDENTIALS_REQUIRED = "103007";
export const ERR_AUTH_PARTNER_REQUIRED = "103008";
