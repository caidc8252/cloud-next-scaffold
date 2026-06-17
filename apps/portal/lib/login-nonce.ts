import "server-only";

import { kv } from "@cloud/cache";
import { generateToken } from "@cloud/security/token";

// 登录防重放：challenge 端点签发一次性 nonce，前端放进加密登录包，登录时 consume。
// TTL 略大于时间戳窗（120s），保证窗内合法包能消费、过期包自然失效。
const LOGIN_NONCE_TTL_SECONDS = 130;
const nonceKey = (nonce: string) => `AUTH:LOGIN-NONCE:${nonce}`;

/** 签发一次性登录 nonce。 */
export async function issueLoginNonce(): Promise<string> {
  const nonce = generateToken();
  await kv.set(nonceKey(nonce), 1, LOGIN_NONCE_TTL_SECONDS);
  return nonce;
}

/** 消费 nonce：存在即删并返回 true（单次有效）；不存在（重放 / 过期）返回 false。 */
export async function consumeLoginNonce(nonce: string): Promise<boolean> {
  const key = nonceKey(nonce);
  const existed = await kv.get(key);
  await kv.del(key);
  return existed != null;
}
