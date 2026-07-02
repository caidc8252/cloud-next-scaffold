import { expect, test } from "@playwright/test";

type ApiResponse<T> = {
  code: string;
  data: T;
};

async function readApiJson<T>(response: { json(): Promise<unknown> }): Promise<ApiResponse<T>> {
  return (await response.json()) as ApiResponse<T>;
}

// @authBoundary: company, oidc, select-partner fail closed until a real auth flow is present.
test("auth shims return stable payloads and auth boundaries fail closed", async ({ request }) => {
  const idpAccounts = await request.get("/api/auth/idp-accounts");
  expect(idpAccounts.ok()).toBeTruthy();
  await expect(readApiJson<{ accounts: unknown[] }>(idpAccounts)).resolves.toMatchObject({
    code: "OK",
    data: { accounts: [] },
  });

  const ssoDomains = await request.get("/api/auth/sso-domains");
  expect(ssoDomains.ok()).toBeTruthy();
  await expect(readApiJson<{ tenants: unknown[] }>(ssoDomains)).resolves.toMatchObject({
    code: "OK",
    data: { tenants: [] },
  });

  const serverTime = await request.get("/api/auth/server-time");
  expect(serverTime.ok()).toBeTruthy();
  const serverTimeJson = await readApiJson<{ serverTimestamp: number; nonce: string }>(serverTime);
  expect(serverTimeJson.data.serverTimestamp).toEqual(expect.any(Number));
  expect(serverTimeJson.data.nonce).toEqual(expect.any(String));

  const company = await request.post("/api/auth/company", { data: {} });
  expect(company.status()).toBe(400);
  await expect(company.json()).resolves.toMatchObject({ code: "12002" });

  const oidc = await request.post("/api/auth/oidc", { data: {} });
  expect(oidc.status()).toBe(400);
  await expect(oidc.json()).resolves.toMatchObject({ code: "12002" });

  const selectPartner = await request.post("/api/auth/select-partner", { data: {} });
  expect(selectPartner.status()).toBe(400);
  await expect(selectPartner.json()).resolves.toMatchObject({ code: "12008" });
});
