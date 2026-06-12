import "server-only";

import { getAuthConfig } from "@cloud/config";
import { decryptRsaOaep } from "@cloud/security/server";
import { BusinessError } from "@cloud/request";
import { loginPayloadSchema } from "@/service/auth/schemas/auth.schema";
import { isTimestampFresh } from "@/lib/login-checks";
import { consumeLoginNonce } from "@/lib/login-nonce";
import { isPasswordValid } from "@/lib/password-rules";
import { ERR_AUTH_ENCRYPTION_INVALID, ERR_AUTH_REQUEST_EXPIRED } from "@/lib/auth-error-codes";

// 解密 + 校验前端提交的新密码（RSA 包体 + 双向时间戳窗 + nonce 单次消费 + 复杂度策略），
// 与登录同安全姿态。返回校验过的**明文**：调用方再 hash；改密场景还需用明文对历史哈希做复用检查。
// weakCode 由调用方传（onboarding / forgot 各自的"密码不达标"业务码）。onboarding 与 forgot 共用。
export async function decryptAndValidatePassword(
  encryptedPassword: string,
  now: Date,
  weakCode: string,
): Promise<string> {
  const auth = getAuthConfig();
  let payload: { password: string; timestamp: number; nonce: string };
  try {
    payload = loginPayloadSchema.parse(JSON.parse(decryptRsaOaep(encryptedPassword, auth.rsaPrivateKey)));
  } catch {
    throw new BusinessError(ERR_AUTH_ENCRYPTION_INVALID);
  }
  if (!isTimestampFresh(payload.timestamp, now.getTime(), auth.timestampWindowMs)) {
    throw new BusinessError(ERR_AUTH_REQUEST_EXPIRED);
  }
  if (!(await consumeLoginNonce(payload.nonce))) {
    throw new BusinessError(ERR_AUTH_REQUEST_EXPIRED);
  }
  if (!isPasswordValid(payload.password)) throw new BusinessError(weakCode);
  return payload.password;
}
