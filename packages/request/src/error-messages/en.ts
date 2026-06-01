import type { ErrorMessages } from "./index.ts";
import {
  ERR_BAD_REQUEST,
  ERR_UNAUTHORIZED,
  ERR_FORBIDDEN,
  ERR_NOT_FOUND,
  ERR_INTERNAL,
  ERR_INVALID_JSON,
  ERR_INVALID_ID,
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
} from "../error-codes.ts";

// 英文基底：每个错误码都必须有一条文案，其余 locale 缺 key 时回退到这里。
export const en: ErrorMessages = {
  // Common
  [ERR_BAD_REQUEST]: "Bad request.",
  [ERR_UNAUTHORIZED]: "Authentication is required or your session has expired.",
  [ERR_FORBIDDEN]: "You don't have permission to perform this action.",
  [ERR_NOT_FOUND]: "The requested resource was not found.",
  [ERR_INTERNAL]: "Internal server error.",
  [ERR_INVALID_JSON]: "The request body is not valid JSON.",
  [ERR_INVALID_ID]: "The provided identifier is invalid.",
  // Users
  [ERR_USER_EMAIL_INVALID]: "A valid email address is required.",
  [ERR_USER_EMAIL_TAKEN]: "This email address is already in use.",
  [ERR_USER_NOT_FOUND]: "User not found.",
  [ERR_USER_RESET_PW_PENDING]: "A password reset is already pending for this user.",
  [ERR_USER_NO_PENDING_INVITE]: "This user has no pending invitation.",
  [ERR_USER_CANCEL_NOT_PENDING]: "Only pending invitations can be cancelled.",
  [ERR_USER_PROTECTED]: "This user is protected and cannot be modified.",
  [ERR_USER_CANNOT_DISABLE_SELF]: "You cannot disable your own account.",
  // Roles
  [ERR_ROLE_NOT_FOUND]: "Role not found.",
  [ERR_ROLE_NAME_SHORT]: "The role name is too short.",
  [ERR_ROLE_DELETE_BUILTIN]: "Built-in roles cannot be deleted.",
  [ERR_ROLE_DELETE_ASSIGNED]: "Roles with assigned users cannot be deleted.",
};
