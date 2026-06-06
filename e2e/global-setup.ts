// next-kit:e2e-bootstrap v3
//
// STUB landed by `bin/setup e2e`. The CONTRACT bits below are filled in
// (env fast-fail, three roles, captcha header, storageState paths). The
// only thing you must complete is the actual SIGN-IN flow for this app —
// see the TODO. Do NOT commit real credentials; values come from .env.test.
import { chromium, type FullConfig } from '@playwright/test';

const REQUIRED = [
  'E2E_BASE_URL',
  'E2E_USER_EMAIL',
  'E2E_USER_PASSWORD',
  'E2E_ADMIN_EMAIL',
  'E2E_ADMIN_PASSWORD',
  'E2E_CAPTCHA_BYPASS_TOKEN',
] as const;

// NOTE: this app authenticates by `account` (the SysUser.username), not email.
// The E2E_*_EMAIL env vars therefore carry the account/username (the seeded
// admin's username is `admin`). Login is POST /api/auth/login → JSON
// { data: { redirectTo } }: `/` for a single-entity user, `/select-entity`
// for a multi-entity user, `/locked` for one with no active entity. We drive
// the route directly (not the UI): page.request shares the context cookie jar,
// so the session cookie set by createSession() is captured by storageState().
async function signInAndSave(
  baseURL: string,
  account: string,
  password: string,
  storageStatePath: string,
): Promise<void> {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    baseURL,
    extraHTTPHeaders: { 'X-E2E-Bypass-Captcha': process.env.E2E_CAPTCHA_BYPASS_TOKEN! },
  });
  try {
    const res = await page.request.post('/api/auth/login', { data: { account, password } });
    if (!res.ok()) {
      throw new Error(
        `global-setup: login failed for ${account} (HTTP ${res.status()}): ${await res.text()}`,
      );
    }
    const redirectTo = ((await res.json()) as { data?: { redirectTo?: string } }).data?.redirectTo;
    if (redirectTo === '/select-entity') {
      // Multi-entity users need an explicit entity pick, which requires an
      // entityId this setup can't infer. Seed/point this role at a
      // single-entity test user instead.
      throw new Error(
        `global-setup: ${account} resolves to multiple entities (redirectTo=/select-entity). ` +
          `Use a single-entity test user, or extend this setup to POST /api/auth/select-entity.`,
      );
    }
    if (redirectTo === '/locked') {
      throw new Error(`global-setup: ${account} has no active entity (redirectTo=/locked).`);
    }
    // Session cookie now lives in the shared context jar — persist it.
    await page.context().storageState({ path: storageStatePath });
  } finally {
    await browser.close();
  }
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const missing = REQUIRED.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`global-setup: missing env vars: ${missing.join(', ')}. See .env.test.example.`);
  }
  const baseURL = process.env.E2E_BASE_URL!;
  await signInAndSave(baseURL, process.env.E2E_USER_EMAIL!, process.env.E2E_USER_PASSWORD!, 'e2e/.auth/user.json');
  await signInAndSave(baseURL, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASSWORD!, 'e2e/.auth/admin.json');
}
