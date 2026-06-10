// next-kit:e2e-bootstrap v3
import { defineConfig } from '@playwright/test';
import { config } from 'dotenv';

// Load the gitignored .env.test before the config (and global-setup) read
// process.env. Without this the E2E_* + DATABASE_URL fast-fail in global-setup.
config({ path: '.env.test' });

export default defineConfig({
  testDir: 'e2e',
  workers: 1, // the truncate-between fixture is not parallel-safe
  globalSetup: './e2e/global-setup.ts',
  reporter: [['html'], ['json', { outputFile: '.e2e/raw.json' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL,
    extraHTTPHeaders: {
      'X-E2E-Bypass-Captcha': process.env.E2E_CAPTCHA_BYPASS_TOKEN ?? '',
    },
  },
  projects: [
    { name: 'anon', use: {} },
    { name: 'user', use: { storageState: 'e2e/.auth/user.json' } },
    { name: 'admin', use: { storageState: 'e2e/.auth/admin.json' } },
  ],
});
