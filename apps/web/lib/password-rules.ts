import { PASSWORD_POLICY } from "@cloud/constants";

// Client-safe password policy checks driven by the shared @cloud/constants policy
// (minLength etc.). @cloud/constants is a plain constant module — no server-only —
// so the checklist can run in the browser.
export const PW_MIN = PASSWORD_POLICY.minLength;

export function passwordChecks(pw: string) {
  return {
    length: pw.length >= PW_MIN,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    digit: /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
}

export function isPasswordValid(pw: string): boolean {
  const c = passwordChecks(pw);
  return c.length && c.upper && c.lower && c.digit && c.symbol;
}

/** Whether a candidate password satisfies the configured complexity policy. */
export function meetsPasswordPolicy(password: string): boolean {
  return isPasswordValid(password);
}

/** The recent-hash window to check a new password against (current hash first). */
export function recentPasswordHashes(currentHash: string, history: string[]): string[] {
  return [currentHash, ...history].slice(0, PASSWORD_POLICY.historySize);
}

/** The history to persist after a rotation: previous hash prepended, capped. */
export function buildNextPasswordHistory(previousHash: string, history: string[]): string[] {
  return [previousHash, ...history].slice(0, PASSWORD_POLICY.historySize);
}
