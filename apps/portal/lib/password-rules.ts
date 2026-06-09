import { PASSWORD_POLICY } from "@cloud/config/password-policy";

// Client-safe password policy checks driven by the shared @cloud/config policy
// (minLength etc.). The /password-policy entry is a plain constant module — no
// server-only — so the checklist can run in the browser.
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
