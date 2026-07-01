// 登录账号 = email（username→email 迁移后）。仅校验邮箱格式；不再有 "admin" 用户名特例。
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LoginAccountValidationResult =
  | { ok: true; account: string }
  | { ok: false; reason: "required" | "invalidEmail" };

/** 去空白；email 走 citext（大小写不敏感），保留原大小写即可。 */
export function normalizeLoginAccount(account: string): string {
  return account.trim();
}

export function validateLoginAccount(account: string): LoginAccountValidationResult {
  const normalized = normalizeLoginAccount(account);
  if (!normalized) return { ok: false, reason: "required" };
  if (EMAIL_PATTERN.test(normalized)) return { ok: true, account: normalized };
  return { ok: false, reason: "invalidEmail" };
}
