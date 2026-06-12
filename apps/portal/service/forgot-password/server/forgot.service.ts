import "server-only";

import { hashPassword, verifyPassword } from "@cloud/security/server";
import { BusinessError } from "@cloud/request";
import { createLogger } from "@cloud/log";
import { issueRecoveryCode, isRecoveryCodeValid, consumeRecoveryCode } from "@/lib/recovery-code";
import { decryptAndValidatePassword } from "@/lib/password-input";
import { recentPasswordHashes, buildNextPasswordHistory } from "@/lib/password-rules";
import { sendVerifyCodeEmail } from "@/lib/email";
import {
  ERR_FP_CODE_INVALID,
  ERR_FP_PASSWORD_REUSED,
  ERR_FP_PASSWORD_WEAK,
} from "@/lib/forgot-error-codes";
import type { ResetInput, SendCodeInput, VerifyCodeInput } from "../schemas/forgot.schema";
import * as repo from "./forgot.repository";

// 忘记密码编排：发码 / 校验 / 重置。授权凭证 = 6 位验证码（证明邮箱可达），单独的 nonce 防密码包重放。
const log = createLogger("forgot-password");
const RESEND_COOLDOWN_SECONDS = 60;

/** 第 1 步：发码。**防枚举**——无论邮箱是否存在都返回 ok；仅 ACTIVE 用户真发码 + 邮件，发信失败静默吞掉。 */
export async function sendRecoveryCode(input: SendCodeInput): Promise<{ ok: true; cooldownSeconds: number }> {
  const user = await repo.findUserByEmail(input.email);
  if (user && user.status === "ACTIVE") {
    const code = await issueRecoveryCode(input.email);
    try {
      await sendVerifyCodeEmail({ to: input.email, code, intent: "passwordRecovery" });
    } catch (err) {
      // 防枚举 + best-effort：节流/背压等发信失败不暴露给前端，记日志即可。
      log.warn("recovery email enqueue failed", { err });
    }
  }
  return { ok: true, cooldownSeconds: RESEND_COOLDOWN_SECONDS };
}

/** 第 2 步：校验码（不消费，仅 UX 预检）。码错/过期/邮箱不存在归一为 CODE_INVALID 防枚举。 */
export async function verifyRecoveryCode(input: VerifyCodeInput): Promise<{ ok: true }> {
  if (!(await isRecoveryCodeValid(input.email, input.code))) {
    throw new BusinessError(ERR_FP_CODE_INVALID);
  }
  return { ok: true };
}

/** 第 3 步：设新密码。再校验码 → 解密+复杂度 → 历史去重 → 更新（清刷错锁）→ 消费码。 */
export async function resetPassword(input: ResetInput): Promise<{ ok: true }> {
  if (!(await isRecoveryCodeValid(input.email, input.code))) {
    throw new BusinessError(ERR_FP_CODE_INVALID);
  }
  const user = await repo.findUserByEmail(input.email);
  if (!user || user.status !== "ACTIVE") throw new BusinessError(ERR_FP_CODE_INVALID);

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
  await consumeRecoveryCode(input.email);
  return { ok: true };
}
