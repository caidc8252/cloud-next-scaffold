import { PASSWORD_POLICY } from "@cloud/config/password-policy";

// Pure password-policy helpers (no I/O) so they can be unit-tested and shared
// between the change-password route and the client checklist.

/** Whether a candidate password satisfies the configured complexity policy. */
export function meetsPasswordPolicy(password: string): boolean {
  const p = PASSWORD_POLICY;
  if (password.length < p.minLength) return false;
  if (p.requireUpper && !/[A-Z]/.test(password)) return false;
  if (p.requireLower && !/[a-z]/.test(password)) return false;
  if (p.requireDigit && !/\d/.test(password)) return false;
  if (p.requireSymbol && !/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}

/** The recent-hash window to check a new password against (current hash first). */
export function recentPasswordHashes(currentHash: string, history: string[]): string[] {
  return [currentHash, ...history].slice(0, PASSWORD_POLICY.historySize);
}

/** The history to persist after a rotation: previous hash prepended, capped. */
export function buildNextPasswordHistory(previousHash: string, history: string[]): string[] {
  return [previousHash, ...history].slice(0, PASSWORD_POLICY.historySize);
}
