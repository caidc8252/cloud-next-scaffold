// Stable codes shared by handlers (throw) and the client (localize by code).
// Mock-local strings — a real build would register these in
// @cloud/request/error-codes. The client maps each to an i18n message; the
// server message is only a non-displayed fallback.
export const AUTH_BAD_CREDENTIALS = "AUTH_BAD_CREDENTIALS";
export const AUTH_SIGNIN_FAILED = "AUTH_SIGNIN_FAILED";
export const INVITE_NOT_FOUND = "INVITE_NOT_FOUND";
