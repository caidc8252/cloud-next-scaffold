import "server-only";

import { authenticator } from "otplib";

authenticator.options = { step: 30, digits: 6, window: 1 };

export function verifyTotp(code: string, secret: string): boolean {
  try {
    return authenticator.check(code.trim(), secret);
  } catch {
    return false;
  }
}
