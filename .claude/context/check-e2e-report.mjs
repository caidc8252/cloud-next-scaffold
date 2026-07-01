#!/usr/bin/env node
// Fail-loud guard: a real `playwright test` run writes the html report + json.
// If they're absent, the run was skipped or its reporter was overridden
// (e.g. --reporter=list) — the human-review artifact is gone. Mirrors how
// check-diff-coverage errors without coverage/lcov.info. Runs after the suite.
import { existsSync } from 'node:fs';

const required = ['playwright-report/index.html', '.e2e/raw.json'];
const missing = required.filter(p => !existsSync(p));
if (missing.length) {
  console.error(
    `E2E report missing: ${missing.join(', ')}.\n` +
      `The Playwright run produced no report — it was skipped or run with a ` +
      `--reporter override. Re-run \`pnpm test:e2e\` (no --reporter flag).`,
  );
  process.exit(1);
}
console.log('E2E report present: playwright-report/ + .e2e/raw.json');
