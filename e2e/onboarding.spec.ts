import { expect, test } from "@playwright/test";
import { truncateAll } from "./fixtures/db";

type ApiResponse<T> = {
  code: string;
  data: T;
};

test.beforeEach(async () => {
  await truncateAll();
});

test("public onboarding invite lookup returns the pending invitation", async ({ request }) => {
  const inviteEmail = `onboarding-${Date.now()}@e2e.test`;

  const created = await request.post("/api/system/users", {
    data: { email: inviteEmail, roleIds: [] },
  });
  expect(created.ok()).toBeTruthy();
  const createdJson = (await created.json()) as ApiResponse<{ inviteToken: string }>;
  const token = createdJson.data.inviteToken;
  expect(token).toBeTruthy();

  const invite = await request.get(`/api/onboarding/invite?token=${encodeURIComponent(token)}`);
  expect(invite.ok()).toBeTruthy();
  await expect(invite.json()).resolves.toMatchObject({
    code: "OK",
    data: {
      invitation: {
        inviteEmail,
        partyName: "Platform",
      },
    },
  });

  const invalidAccept = await request.post("/api/onboarding/accept", {
    data: { mode: "register", token },
  });
  expect(invalidAccept.status()).toBe(400);
  await expect(invalidAccept.json()).resolves.toMatchObject({ code: "00006" });
});
