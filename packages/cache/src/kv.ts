import { getRedis } from "./client.ts";

export const kv = {
  async get<T>(key: string): Promise<T | null> {
    const raw = await getRedis().get(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  },
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const payload = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await getRedis().set(key, payload, "EX", ttlSeconds);
    } else {
      await getRedis().set(key, payload);
    }
  },
  async del(key: string): Promise<void> {
    await getRedis().del(key);
  },
  async expire(key: string, ttlSeconds: number): Promise<void> {
    await getRedis().expire(key, ttlSeconds);
  },
};
