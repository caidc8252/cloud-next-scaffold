import Redis from "ioredis";
import { getConfig } from "@cloud/config";

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(getConfig().REDIS_URL, {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
  }
  return client;
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
