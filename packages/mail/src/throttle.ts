import "server-only";

import { getRedis } from "@cloud/cache";
import { BusinessError } from "@cloud/request";
import { ERR_TOO_MANY_REQUESTS } from "@cloud/request/error-codes";
import { createLogger, maskEmail } from "@cloud/log";

const log = createLogger("mail");

// 防止同一收件人被刷：按 (收件人, 用途) 双层节流。背压（队列深度）保护系统，但拦不住
// 单点轰炸，故对用户可触发的邮件（验证码 / 重置密码）在入队前调用本函数。
export type RecipientThrottlePolicy = {
  cooldownSeconds: number; // 最小发送间隔
  maxPerWindow: number; // 滚动窗口内上限
  windowSeconds: number; // 滚动窗口长度
};

export const DEFAULT_RECIPIENT_THROTTLE: RecipientThrottlePolicy = {
  cooldownSeconds: 60,
  maxPerWindow: 5,
  windowSeconds: 3600,
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// 通过即视为消费一次额度（fire-and-forget，发失败无法回补）。任一层超限抛 429 语义错误。
export async function assertRecipientQuota(
  email: string,
  purpose: string,
  policy: RecipientThrottlePolicy = DEFAULT_RECIPIENT_THROTTLE,
): Promise<void> {
  const redis = getRedis();
  const key = normalizeEmail(email);
  const cooldownKey = `mail:cooldown:${purpose}:${key}`;
  const quotaKey = `mail:quota:${purpose}:${key}`;

  // 冷却：SET NX EX —— 已存在表示仍在最小间隔内。
  const acquired = await redis.set(cooldownKey, "1", "EX", policy.cooldownSeconds, "NX");
  if (acquired === null) {
    log.warn("recipient throttled (cooldown)", {
      purpose,
      email: maskEmail(email),
      cooldownSeconds: policy.cooldownSeconds,
    });
    throw new BusinessError(ERR_TOO_MANY_REQUESTS, 429);
  }

  // 滚动配额：首次 INCR 设窗口过期；超上限即拒。
  const count = await redis.incr(quotaKey);
  if (count === 1) await redis.expire(quotaKey, policy.windowSeconds);
  if (count > policy.maxPerWindow) {
    log.warn("recipient throttled (window cap)", {
      purpose,
      email: maskEmail(email),
      count,
      maxPerWindow: policy.maxPerWindow,
    });
    throw new BusinessError(ERR_TOO_MANY_REQUESTS, 429);
  }
  log.debug("recipient quota ok", { purpose, email: maskEmail(email), count });
}
