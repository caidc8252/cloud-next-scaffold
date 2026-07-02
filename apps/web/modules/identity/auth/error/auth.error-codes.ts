// Module 12 = identity.auth. Format: 5-hex-digit IISSS.
export const ERR_AUTH_MISSING_FIELDS = "12001";
export const ERR_AUTH_INVALID_CREDENTIALS = "12002";
export const ERR_AUTH_ACCOUNT_LOCKED = "12003";
export const ERR_AUTH_NO_ACTIVE_PARTNER = "12004";
export const ERR_AUTH_NOT_AUTHENTICATED = "12005";
export const ERR_AUTH_INVALID_PARTNER = "12006";
// 登录 / 选组织各自的「必填项缺失」专属码，避免共用 ERR_AUTH_MISSING_FIELDS 后
// 文案被本地化收敛成同一句（这两处都是用户可见页面，文案需各自具体）。
export const ERR_AUTH_CREDENTIALS_REQUIRED = "12007";
export const ERR_AUTH_PARTNER_REQUIRED = "12008";
export const ERR_AUTH_ACCOUNT_DISABLED = "12009";
export const ERR_AUTH_ENCRYPTION_INVALID = "1200A";
export const ERR_AUTH_REQUEST_EXPIRED = "1200B";
// 登录第二阶段（MFA 校验）
export const ERR_AUTH_MFA_TOKEN_INVALID = "1200C";
export const ERR_AUTH_MFA_CODE_INVALID = "1200D";
export const ERR_AUTH_MFA_LOCKED = "1200E";
export const ERR_AUTH_MFA_NOT_CONFIGURED = "1200F";
