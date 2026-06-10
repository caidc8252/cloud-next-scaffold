const ADMIN_ACCOUNT = "admin";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LoginAccountValidationResult =
  | { ok: true; account: string }
  | { ok: false; reason: "required" | "invalidEmail" };

export function isAdminAccount(account: string): boolean {
  return account.trim().toLowerCase() === ADMIN_ACCOUNT;
}

export function normalizeLoginAccount(account: string): string {
  return isAdminAccount(account) ? ADMIN_ACCOUNT : account.trim();
}

export function validateLoginAccount(account: string): LoginAccountValidationResult {
  const normalized = normalizeLoginAccount(account);
  if (!normalized) return { ok: false, reason: "required" };
  if (isAdminAccount(normalized) || EMAIL_PATTERN.test(normalized)) {
    return { ok: true, account: normalized };
  }
  return { ok: false, reason: "invalidEmail" };
}
