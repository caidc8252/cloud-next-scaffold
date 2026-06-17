import { TTL } from "@cloud/cache/redis-core";

// @cloud/mail 通用配置：渲染语言 + 派生有效期，供各 app 的 lib/email 复用（避免每 app 重复）。

/** 邮件渲染语言（统一 en；将来切换只改此处）。 */
export const EMAIL_RENDER_LOCALE = "en";

/** 验证码邮件展示的有效期（分钟）：从 redis TTL 真源 `AUTH_VERIFY_CODE_SECONDS` 派生，避免漂移。 */
export const VERIFY_CODE_EXPIRES_MINUTES = Math.round(TTL.AUTH_VERIFY_CODE_SECONDS / 60);
