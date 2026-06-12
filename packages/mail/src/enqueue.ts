import "server-only";

import { getRedis } from "@cloud/cache";
import { MiddlewareError } from "@cloud/request";
import { ERR_MW_MAIL } from "@cloud/request/error-codes";
import { EMAIL_QUEUE_KEY, emailJobInputSchema, type EmailJobInput } from "./queue.ts";

// 系统级背压：入队前若 mail:queue 待处理数已达上限则拒绝，防止外部消费者缺位/变慢时
// 队列无限堆积。软阈值（LLEN 后 LPUSH 非原子，并发可能略微溢出，可接受）。
export const MAX_PENDING_EMAIL_JOBS = 500;

export type EnqueueEmailJobResult = { queueKey: typeof EMAIL_QUEUE_KEY };

export async function enqueueEmailJob(input: EmailJobInput): Promise<EnqueueEmailJobResult> {
  const job = emailJobInputSchema.parse(input);

  const redis = getRedis();
  const pending = await redis.llen(EMAIL_QUEUE_KEY);
  if (pending >= MAX_PENDING_EMAIL_JOBS) {
    // 临时性基础设施压力，调用方应提示"邮件繁忙，稍后重试"。
    throw new MiddlewareError(ERR_MW_MAIL);
  }

  await redis.lpush(EMAIL_QUEUE_KEY, JSON.stringify(job));
  return { queueKey: EMAIL_QUEUE_KEY };
}
