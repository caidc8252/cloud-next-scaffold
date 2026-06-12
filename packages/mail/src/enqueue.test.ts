import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERR_MW_MAIL } from "@cloud/request/error-codes";

const { redis } = vi.hoisted(() => ({
  redis: { llen: vi.fn(), lpush: vi.fn() },
}));
vi.mock("@cloud/cache", () => ({ getRedis: () => redis }));

import { enqueueEmailJob, MAX_PENDING_EMAIL_JOBS } from "./enqueue.ts";
import { EMAIL_QUEUE_KEY } from "./queue.ts";

const job = { receivers: ["a@x.com"], title: "Hi", content: "<p>hello</p>" };

beforeEach(() => {
  redis.llen.mockReset();
  redis.lpush.mockReset().mockResolvedValue(1);
});

describe("enqueueEmailJob", () => {
  it("lpushes a validated job and defaults content_type to text/html", async () => {
    redis.llen.mockResolvedValue(0);
    const res = await enqueueEmailJob(job);
    expect(res.queueKey).toBe(EMAIL_QUEUE_KEY);
    expect(redis.lpush).toHaveBeenCalledOnce();
    const [key, payload] = redis.lpush.mock.calls[0];
    expect(key).toBe(EMAIL_QUEUE_KEY);
    expect(JSON.parse(payload as string)).toEqual({ ...job, content_type: "text/html" });
  });

  it("passes through cc and an explicit content_type", async () => {
    redis.llen.mockResolvedValue(0);
    await enqueueEmailJob({ ...job, cc: ["c@x.com"], content_type: "text/plain" });
    const parsed = JSON.parse(redis.lpush.mock.calls[0][1] as string);
    expect(parsed.cc).toEqual(["c@x.com"]);
    expect(parsed.content_type).toBe("text/plain");
  });

  it("rejects with ERR_MW_MAIL at/above the threshold and does not enqueue", async () => {
    redis.llen.mockResolvedValue(MAX_PENDING_EMAIL_JOBS);
    await expect(enqueueEmailJob(job)).rejects.toMatchObject({ code: ERR_MW_MAIL });
    expect(redis.lpush).not.toHaveBeenCalled();
  });

  it("validates input (empty receivers / blank fields rejected)", async () => {
    redis.llen.mockResolvedValue(0);
    await expect(enqueueEmailJob({ receivers: [], title: "", content: "" })).rejects.toThrow();
    expect(redis.lpush).not.toHaveBeenCalled();
  });
});
