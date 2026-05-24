// Platform 1, Module 00 = Common
export const ERR_BAD_REQUEST = "100001";
export const ERR_UNAUTHORIZED = "100002";
export const ERR_FORBIDDEN = "100003";
export const ERR_NOT_FOUND = "100004";
export const ERR_INTERNAL = "100005";
export const ERR_INVALID_JSON = "100006";
export const ERR_INVALID_ID = "100007";

// Platform 1, Module 01 = Users
export const ERR_USER_EMAIL_INVALID = "101001";
export const ERR_USER_EMAIL_TAKEN = "101002";
export const ERR_USER_NOT_FOUND = "101003";
export const ERR_USER_RESET_PW_PENDING = "101005";
export const ERR_USER_NO_PENDING_INVITE = "101006";
export const ERR_USER_CANCEL_NOT_PENDING = "101007";
export const ERR_USER_PROTECTED = "101008";

// Platform 1, Module 02 = Roles
export const ERR_ROLE_NOT_FOUND = "102001";
export const ERR_ROLE_NAME_SHORT = "102002";
export const ERR_ROLE_DELETE_BUILTIN = "102003";
export const ERR_ROLE_DELETE_ASSIGNED = "102004";
