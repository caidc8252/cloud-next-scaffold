import "server-only";

import { hashPassword, verifyPassword } from "@cloud/security/server";
import { BusinessError } from "@cloud/request";
import { createLogger } from "@cloud/log";
import {
  issueSelfServiceResetToken,
  readResetToken,
  consumeResetToken,
} from "@/lib/password-reset-token";
import { decryptAndValidatePassword } from "@/lib/password-input";
import { recentPasswordHashes, buildNextPasswordHistory } from "@/lib/password-rules";
import { sendResetLinkEmail } from "@/lib/email";
import {
  ERR_FP_TOKEN_INVALID,
  ERR_FP_PASSWORD_REUSED,
  ERR_FP_PASSWORD_WEAK,
} from "@/lib/forgot-error-codes";
import type { ResetInput, SendLinkInput } from "../schema/forgot.schema";
import * as repo from "./forgot.repository";

// 重置密码（自助找回触发 + 共享消费端）。统一 token 链接：触发签发 token + 发链接邮件；
// 消费端 /reset-password 用 token 解出 userId 设新密码。管理员触发在 admin 侧签同样的 token。
const log = createLogger("forgot-password");
const RESEND_COOLDOWN_SECONDS = 60;
const SELF_SERVICE_EXPIRES_TEXT = "60 minutes";

/** 自助触发：发重置链接。**防枚举**——恒返回 ok；仅 ACTIVE 用户真签 token + 发信，发信失败静默吞掉。 */
export async function sendResetLink(input: SendLinkInput): Promise<{ ok: true; cooldownSeconds: number }> {
  const user = await repo.findUserByEmail(input.email);
  if (user && user.status === "ACTIVE") {
    const token = await issueSelfServiceResetToken(user.userId);
    try {
      await sendResetLinkEmail({ to: input.email, token, expiresText: SELF_SERVICE_EXPIRES_TEXT });
    } catch (err) {
      log.warn("reset link email enqueue failed", { err });
    }
  }
  return { ok: true, cooldownSeconds: RESEND_COOLDOWN_SECONDS };
}

/** 重置页加载校验 token（非破坏性）。 */
export async function validateResetToken(token: string): Promise<{ valid: boolean }> {
  return { valid: (await readResetToken(token)) !== null };
}

/** 消费端：设新密码。token→userId → 解密+复杂度 → 历史去重 → 更新（清刷错锁）→ 消费 token。 */
export async function resetPassword(input: ResetInput): Promise<{ ok: true }> {
  const entry = await readResetToken(input.token);
  if (!entry) throw new BusinessError(ERR_FP_TOKEN_INVALID);

  const user = await repo.findUserById(entry.userId);
  if (!user || user.status !== "ACTIVE") throw new BusinessError(ERR_FP_TOKEN_INVALID);

  const newPassword = await decryptAndValidatePassword(input.encryptedPassword, new Date(), ERR_FP_PASSWORD_WEAK);

  const history = Array.isArray(user.passwordHistory) ? (user.passwordHistory as string[]) : [];
  for (const hash of recentPasswordHashes(user.passwordHash, history)) {
    if (await verifyPassword(hash, newPassword)) throw new BusinessError(ERR_FP_PASSWORD_REUSED);
  }

  await repo.updatePassword(user.userId, {
    passwordHash: await hashPassword(newPassword),
    passwordHistory: buildNextPasswordHistory(user.passwordHash, history),
    passwordChangedTimestamp: new Date(),
  });
  await consumeResetToken(input.token);
  return { ok: true };
}
