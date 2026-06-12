import "server-only";

// 邮件能力（@cloud/mail）：把"要发的邮件"推进 Redis mail:queue，外部平台消费发信。
// transport + 机制在这里；各业务邮件的模板与文案留各 app（lib/email + i18n email.*）。
// 设计见 docs/design-bridge/email-capability/。

export { EMAIL_QUEUE_KEY, emailJobInputSchema, type EmailJobInput } from "./queue.ts";
export { enqueueEmailJob, MAX_PENDING_EMAIL_JOBS, type EnqueueEmailJobResult } from "./enqueue.ts";
export {
  assertRecipientQuota,
  DEFAULT_RECIPIENT_THROTTLE,
  type RecipientThrottlePolicy,
} from "./throttle.ts";
export { escapeHtml } from "./escape.ts";
export {
  renderAndEnqueue,
  type EmailTemplate,
  type EmailTranslate,
  type RenderAndEnqueueOptions,
} from "./render.ts";
