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

// 密码历史去重（与 admin 同口径）：检查窗口含当前哈希 + 历史，上限 historySize(5)。
export function recentPasswordHashes(currentHash: string, history: string[]): string[] {
  return [currentHash, ...history].slice(0, PASSWORD_POLICY.historySize);
}

/** 轮换后要持久化的历史：旧哈希前插、截断到上限。 */
export function buildNextPasswordHistory(previousHash: string, history: string[]): string[] {
  return [previousHash, ...history].slice(0, PASSWORD_POLICY.historySize);
}
