import "server-only";

import { enqueueEmailJob } from "./enqueue.ts";
import { assertRecipientQuota, type RecipientThrottlePolicy } from "./throttle.ts";
import { createLogger } from "@cloud/log";

const log = createLogger("mail");

// 译者由 app 注入（按收件人 locale 取词，统一走 @cloud/i18n，包不直接依赖 i18n）。
export type EmailTranslate = (key: string, values?: Record<string, string | number>) => string;

// 业务邮件模板：纯函数，输入类型化变量 + 译者，输出 subject(title) + HTML 正文。
// 约定：title 为纯文本主题（勿转义）；content 为极简 HTML，模板需对注入的变量调 escapeHtml。
export type EmailTemplate<V> = (vars: V, t: EmailTranslate) => { title: string; content: string };

export type RenderAndEnqueueOptions<V> = {
  template: EmailTemplate<V>;
  vars: V;
  t: EmailTranslate;
  receivers: string[];
  purpose?: string; // 传则对每个收件人做节流（用户可触发的邮件应传）
  throttle?: RecipientThrottlePolicy;
};

// 渲染机制：(可选)按收件人节流 → 跑模板 → 入队（含队列背压）。
export async function renderAndEnqueue<V>(opts: RenderAndEnqueueOptions<V>): Promise<void> {
  log.debug("render + enqueue", { purpose: opts.purpose, receivers: opts.receivers.length });
  if (opts.purpose) {
    for (const receiver of opts.receivers) {
      await assertRecipientQuota(receiver, opts.purpose, opts.throttle);
    }
  }
  const { title, content } = opts.template(opts.vars, opts.t);
  await enqueueEmailJob({ receivers: opts.receivers, title, content });
}
