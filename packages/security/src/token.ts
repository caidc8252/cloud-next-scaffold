import "server-only";

import { randomBytes } from "node:crypto";

// 生成不可猜的 URL-safe 随机 token（base64url）。默认 32 字节 = 256-bit 熵。
// 独立于 ./server 桶导出（不经 argon2.ts），故 import 本模块不会牵入 argon2 原生依赖——
// 让 @cloud/permissions 等只需 token 的消费方可安全引用。
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
