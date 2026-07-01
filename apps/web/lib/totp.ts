import "server-only";

import { authenticator } from "otplib";

// TOTP 生成/校验（MFA）。step=60s、digits=6，校验时容忍 ±1 个时间步以吸收时钟漂移。
// step 同时由 keyuri 编进 otpauth period，保证认证器端与校验端一致（注：60s 非主流默认，依赖 App 读取 period）。
// secret 为 base32；加解密（AES）走 @cloud/security 的 encryptSecret/decryptSecret，本模块只管算法。
authenticator.options = { step: 60, digits: 6, window: 1 };

/** 生成新的 base32 TOTP 密钥。 */
export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

/** 构造 otpauth:// URI 供认证器扫码。label = 账号，issuer = 展示名。 */
export function totpKeyUri(accountName: string, issuer: string, secret: string): string {
  return authenticator.keyuri(accountName, issuer, secret);
}

/** 校验 6 位动态码；非法输入或内部异常时返回 false（不抛）。 */
export function verifyTotp(code: string, secret: string): boolean {
  try {
    return authenticator.check(code.trim(), secret);
  } catch {
    return false;
  }
}
