// next-kit:e2e-bootstrap v14
// Permanent harness CANARY (not a feature tracer — no @e2e-cell marker). Leading `_` sorts
// it first under workers:1 so the env fails fast. Proves the basic e2e env end-to-end.
import { test, expect } from '@playwright/test';
import { truncateAll, signInForE2E } from '../e2e.nextkit.ts';

const AUTHED_PATH = process.env.E2E_AUTHED_PATH ?? '/';

test('anon hits a guarded route → redirected to login (gating works)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'anon', 'anon project only');
  await page.goto(AUTHED_PATH);
  await expect(page).toHaveURL(/\/login/);
});

test('admin session survives truncateAll() via re-login (proves KEEP)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'admin', 'admin project only');
  // Authed via the stored storageState.
  await page.goto(AUTHED_PATH);
  await expect(page).not.toHaveURL(/\/login/);
  // Sessions are Redis-only, so the live session survives truncation regardless of KEEP —
  // only a RE-LOGIN (which reads identity rows from Postgres) exercises whether the kept
  // rows survived. signInForE2E throws if login fails, so an empty/wrong KEEP fails here.
  await truncateAll();
  await signInForE2E({
    role: 'admin',
    portalUrl: process.env.E2E_PORTAL_URL!,
    baseURL: process.env.E2E_BASE_URL!,
    email: process.env.E2E_ADMIN_EMAIL!,
    password: process.env.E2E_ADMIN_PASSWORD!,
  });
});

// No pool teardown here. The harness pool is shared whole-run and this canary sorts FIRST —
// a pool.end() here would poison every later spec. allowExitOnIdle (e2e.nextkit.ts) exits clean.
