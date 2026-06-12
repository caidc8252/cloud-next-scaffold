import "server-only";

import { authenticator } from "otplib";

// step=60s（与 admin 一致；登录二次校验用）。keyuri 在 admin 侧编 period=60，认证器端按 period 算。
authenticator.options = { step: 60, digits: 6, window: 1 };

export function verifyTotp(code: string, secret: string): boolean {
  try {
    return authenticator.check(code.trim(), secret);
  } catch {
    return false;
  }
}
