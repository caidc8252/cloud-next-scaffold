// next-kit:e2e-bootstrap v14
//
// Suite-local Playwright config for the deploy-then-test journey suite. Runs the specs in THIS
// folder against a DEPLOYED app — no webServer (the app is already running), no globalSetup, no
// DB/Redis. Point E2E_BASE_URL / E2E_PORTAL_URL at any deployed stack, then run:
//   npx playwright test --config e2e/flows/playwright.config.ts
import { defineConfig } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL;
if (!baseURL) throw new Error('e2e/flows: E2E_BASE_URL is required (the deployed console URL).');
if (!process.env.E2E_PORTAL_URL) throw new Error('e2e/flows: E2E_PORTAL_URL is required (the login host).');

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  workers: 1, // serial flows share state within a flow
  reporter: [['html', { open: 'never' }], ['json', { outputFile: '.e2e/flows.json' }]],
  use: { baseURL, trace: 'on-first-retry' },
});
