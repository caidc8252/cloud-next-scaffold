import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERR_TOO_MANY_REQUESTS } from "@cloud/request/error-codes";

const { redis } = vi.hoisted(() => ({
  redis: { set: vi.fn(), incr: vi.fn(), expire: vi.fn() },
}));
vi.mock("@cloud/cache", () => ({ getRedis: () => redis }));

import { assertRecipientQuota, DEFAULT_RECIPIENT_THROTTLE } from "./throttle.ts";

beforeEach(() => {
  redis.set.mockReset();
  redis.incr.mockReset();
  redis.expire.mockReset().mockResolvedValue(1);
});

describe("assertRecipientQuota", () => {
  it("passes within cooldown + window, sets window expiry on first send", async () => {
    redis.set.mockResolvedValue("OK");
    redis.incr.mockResolvedValue(1);
    await expect(assertRecipientQuota("a@x.com", "verify-code")).resolves.toBeUndefined();
    expect(redis.set).toHaveBeenCalledWith(
      "mail:cooldown:verify-code:a@x.com",
      "1",
      "EX",
      DEFAULT_RECIPIENT_THROTTLE.cooldownSeconds,
      "NX",
    );
    expect(redis.expire).toHaveBeenCalledWith(
      "mail:quota:verify-code:a@x.com",
      DEFAULT_RECIPIENT_THROTTLE.windowSeconds,
    );
  });

  it("rejects while still cooling down (SET NX returns null) and never touches quota", async () => {
    redis.set.mockResolvedValue(null);
    await expect(assertRecipientQuota("a@x.com", "verify-code")).rejects.toMatchObject({
      code: ERR_TOO_MANY_REQUESTS,
    });
    expect(redis.incr).not.toHaveBeenCalled();
  });

  it("rejects once the rolling window cap is exceeded", async () => {
    redis.set.mockResolvedValue("OK");
    redis.incr.mockResolvedValue(DEFAULT_RECIPIENT_THROTTLE.maxPerWindow + 1);
    await expect(assertRecipientQuota("a@x.com", "verify-code")).rejects.toMatchObject({
      code: ERR_TOO_MANY_REQUESTS,
    });
  });

  it("does not reset the window expiry on subsequent sends", async () => {
    redis.set.mockResolvedValue("OK");
    redis.incr.mockResolvedValue(2);
    await assertRecipientQuota("a@x.com", "verify-code");
    expect(redis.expire).not.toHaveBeenCalled();
  });

  it("normalizes the email (case/whitespace) for the keys", async () => {
    redis.set.mockResolvedValue("OK");
    redis.incr.mockResolvedValue(1);
    await assertRecipientQuota("  A@X.com ", "invite");
    expect(redis.set).toHaveBeenCalledWith(
      "mail:cooldown:invite:a@x.com",
      "1",
      "EX",
      expect.any(Number),
      "NX",
    );
  });
});
