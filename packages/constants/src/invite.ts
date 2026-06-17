// 邀请链接默认有效期（7 天，单位 ms）。DB 背书的业务有效期（非 Redis key TTL），跨 app 共享。
export const INVITE_TTL_MS = 7 * 86_400_000;
