import { describe, expect, it, test } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setupE2e } from '../src/commands/e2e.ts';

function repo(opts: { monorepo?: boolean; migrations?: boolean } = {}) {
  const d = mkdtempSync(join(tmpdir(), 'setup-e2e-'));
  writeFileSync(join(d, 'package.json'), '{\n  "name": "x",\n  "scripts": {}\n}\n');
  if (opts.monorepo) mkdirSync(join(d, 'apps', 'web'), { recursive: true });
  if (opts.migrations) mkdirSync(join(d, 'prisma', 'migrations'), { recursive: true });
  return d;
}

// Alias for new tests added by Task 3
const makeRepo = repo;

describe('setupE2e INSTALL', () => {
  it('lands all artifacts + sentinel on a fresh repo', async () => {
    const d = repo();
    const s = await setupE2e({ rootDir: d, dryRun: false });
    expect(existsSync(join(d, 'playwright.config.ts'))).toBe(true);
    expect(existsSync(join(d, 'e2e/docker-compose.e2e.yml'))).toBe(true);
    expect(existsSync(join(d, 'e2e/fixtures/db.ts'))).toBe(true);
    expect(existsSync(join(d, 'e2e/global-setup.ts'))).toBe(true);
    expect(existsSync(join(d, 'scripts/check-e2e-orphans.mjs'))).toBe(true);
    expect(existsSync(join(d, 'scripts/check-e2e-report.mjs'))).toBe(true);
    expect(existsSync(join(d, '.env.test.example'))).toBe(true);
    expect(readFileSync(join(d, 'playwright.config.ts'), 'utf8')).toMatch(/\/\/ next-kit:e2e-bootstrap v14/);
    const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8'));
    expect(pkg.scripts['test:e2e']).toBe('pnpm test:e2e:spec && pnpm check:e2e-report && pnpm check:e2e-orphans');
    expect(pkg.scripts['test:e2e:spec']).toContain('playwright test');
    expect(pkg.scripts['check:e2e-orphans']).toContain('check-e2e-orphans.mjs');
    expect(pkg.scripts['check:e2e-report']).toContain('check-e2e-report.mjs');
    const gi = readFileSync(join(d, '.gitignore'), 'utf8');
    expect(gi).toMatch(/\.env\.test/);
    expect(gi).toMatch(/e2e\/\.auth\//);
  });

  it('wires a webServer on the uncommon base-url port + lands compose under e2e/', async () => {
    const d = repo();
    await setupE2e({ rootDir: d, dryRun: false });
    // webServer + 3100 live in e2e.nextkit.ts (the logic module), not the thin shim
    const nk = readFileSync(join(d, 'e2e.nextkit.ts'), 'utf8');
    expect(nk).toContain('webServer');
    expect(nk).toContain('3100');
    expect(existsSync(join(d, 'e2e/docker-compose.e2e.yml'))).toBe(true);
    expect(existsSync(join(d, 'docker-compose.e2e.yml'))).toBe(false); // not at root
    const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8'));
    expect(pkg.scripts['test:e2e:spec']).toContain('-f e2e/docker-compose.e2e.yml');
  });

  it('ships a redis-e2e service in the compose (login nonce/session/handoff need Redis)', async () => {
    const d = repo();
    await setupE2e({ rootDir: d, dryRun: false });
    const compose = readFileSync(join(d, 'e2e/docker-compose.e2e.yml'), 'utf8');
    expect(compose).toContain('redis-e2e');
    expect(compose).toMatch(/redis:7/);
  });

  it('test:e2e:spec ends with playwright test (a spec path appended by pnpm reaches playwright), orphan check separate', async () => {
    const d = repo();
    await setupE2e({ rootDir: d, dryRun: false });
    const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8'));
    expect(pkg.scripts['test:e2e:spec']).toMatch(/playwright test$/);
    expect(pkg.scripts['test:e2e:spec']).not.toContain('check-e2e-orphans');
    expect(pkg.scripts['test:e2e:spec']).not.toContain('check-e2e-report');
  });

  it('guards a missing .env.test at the front of test:e2e:spec, before --env-file aborts (v9+)', async () => {
    const d = repo();
    await setupE2e({ rootDir: d, dryRun: false });
    const spec = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8')).scripts['test:e2e:spec'];
    expect(spec).toMatch(/^\[ -f \.env\.test \] \|\|/); // guard runs first
    expect(spec).toContain('.env.test.example'); // message points at the fix
    expect(spec.indexOf('-f .env.test')).toBeLessThan(spec.indexOf('--env-file')); // guards before the cryptic abort
  });

  it('drives prisma through the kit wrapper + seeds, never bare prisma (#19.1)', async () => {
    const d = repo({ migrations: false });
    await setupE2e({ rootDir: d, dryRun: false });
    const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8'));
    expect(pkg.scripts['test:e2e:spec']).toContain('node --env-file=.env.test scripts/prisma.mjs db push && E2E_SEED=1 node --env-file=.env.test scripts/prisma.mjs db seed');
    expect(pkg.scripts['test:e2e:spec']).not.toContain('--skip-generate');
    expect(pkg.scripts['test:e2e:spec']).not.toMatch(/(?<!:)\bprisma db push\b/); // no bare prisma
    expect(pkg.scripts['test:e2e:spec']).not.toContain('pnpm db:push'); // must carry .env.test, not root .env
  });

  it('routes a migrations-dir repo through the wrapper too + seeds', async () => {
    const d = repo({ migrations: true });
    await setupE2e({ rootDir: d, dryRun: false });
    const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8'));
    expect(pkg.scripts['test:e2e:spec']).toContain('node --env-file=.env.test scripts/prisma.mjs migrate deploy && E2E_SEED=1 node --env-file=.env.test scripts/prisma.mjs db seed');
  });

  it('the db fixture truncates via a raw pg client, never the Prisma client (#19.2)', async () => {
    const d = repo();
    await setupE2e({ rootDir: d, dryRun: false });
    // e2e/fixtures/db.ts is now a thin shim; truncation logic lives in e2e.nextkit.ts
    const nk = readFileSync(join(d, 'e2e.nextkit.ts'), 'utf8');
    expect(nk).toContain("from 'pg'"); // raw client — the Prisma 7 ESM client can't load under Playwright
    expect(nk).toContain('TRUNCATE');
    expect(nk).not.toMatch(/from\s*['"]@cloud\/db['"]/); // no Prisma singleton import (breaks playwright test --list)
    expect(nk).not.toMatch(/import\s*\{[^}]*\}\s*from\s*['"]@prisma\/client['"]/);
    expect(nk).not.toMatch(/new\s+PrismaClient\s*\(/);
  });

  it('the db fixture carries a KEEP list so seeded identity tables survive truncation (v7)', async () => {
    const d = repo();
    await setupE2e({ rootDir: d, dryRun: false });
    // KEEP logic lives in e2e.nextkit.ts; e2e/fixtures/db.ts re-exports from it
    const nk = readFileSync(join(d, 'e2e.nextkit.ts'), 'utf8');
    expect(nk).toMatch(/DEFAULT_KEEP/);
    expect(nk).toContain('_prisma_migrations');
    expect(nk).toMatch(/keep/); // per-call override via opts.keep
  });

  it('verifyHint points at seeded admin creds', async () => {
    const d = repo();
    const s = await setupE2e({ rootDir: d, dryRun: false });
    expect(s.verifyHint).toContain('admin@newlandnpt.com');
    expect(s.verifyHint).not.toContain('AskUserQuestion for the 5'); // creds come from the seed
  });

  it('adds @playwright/test + dotenv + pg as devDependencies (#19.3)', async () => {
    const d = repo();
    await setupE2e({ rootDir: d, dryRun: false });
    const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8'));
    expect(pkg.devDependencies['@playwright/test']).toBeDefined();
    expect(pkg.devDependencies.dotenv).toBeDefined();
    expect(pkg.devDependencies.pg).toBeDefined();
    expect(pkg.devDependencies['@types/pg']).toBeDefined();
  });

  it('does not override a consumer-pinned dep', async () => {
    const d = repo();
    writeFileSync(join(d, 'package.json'), '{\n  "scripts": {},\n  "devDependencies": { "dotenv": "^15.0.0" }\n}\n');
    await setupE2e({ rootDir: d, dryRun: false });
    const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8'));
    expect(pkg.devDependencies.dotenv).toBe('^15.0.0');
  });

  it('playwright.config loads .env.test via dotenv (#19.5)', async () => {
    const d = repo();
    await setupE2e({ rootDir: d, dryRun: false });
    const pw = readFileSync(join(d, 'playwright.config.ts'), 'utf8');
    expect(pw).toContain("from 'dotenv'");
    expect(pw).toContain(".env.test");
  });

  it('reports a manual vitest exclude when the config lacks e2e (#19.4)', async () => {
    const d = repo();
    writeFileSync(join(d, 'vitest.config.mts'), 'export default { test: { exclude: ["dist"] } };\n');
    const s = await setupE2e({ rootDir: d, dryRun: false });
    const v = s.patches.find(p => p.file === 'vitest.config.mts');
    expect(v?.status).toBe('manual');
    expect(v?.detail).toContain('configDefaults.exclude');
    // new verifyHint doesn't mention vitest.config but the patch is still present
  });

  it('is a noop on a vitest config that already excludes e2e', async () => {
    const d = repo();
    writeFileSync(join(d, 'vitest.config.mts'), 'export default { test: { exclude: ["e2e/**"] } };\n');
    const s = await setupE2e({ rootDir: d, dryRun: false });
    expect(s.patches.find(p => p.file === 'vitest.config.mts')?.status).toBe('noop');
  });

  it('emits no vitest patch when there is no vitest config', async () => {
    const d = repo();
    const s = await setupE2e({ rootDir: d, dryRun: false });
    expect(s.patches.some(p => p.file.startsWith('vitest.config'))).toBe(false);
  });

  it('sets E2E_MARKER_ROOTS for monorepos (#5) — on the standalone orphan script, so per-change runs carry it', async () => {
    const d = repo({ monorepo: true });
    await setupE2e({ rootDir: d, dryRun: false });
    const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8'));
    expect(pkg.scripts['check:e2e-orphans']).toContain("E2E_MARKER_ROOTS='apps/*/src apps/*/app apps/*/middleware.ts'");
  });

  it('single-app repo gets the orphan script without a marker-roots prefix', async () => {
    const d = repo();
    await setupE2e({ rootDir: d, dryRun: false });
    const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8'));
    expect(pkg.scripts['check:e2e-orphans']).toBe('node scripts/check-e2e-orphans.mjs');
  });

  it('dry-run writes nothing', async () => {
    const d = repo();
    await setupE2e({ rootDir: d, dryRun: true });
    expect(existsSync(join(d, 'playwright.config.ts'))).toBe(false);
  });

  it('writes a .env.test with seeded admin defaults on fresh install', async () => {
    const d = repo();
    await setupE2e({ rootDir: d, dryRun: false });
    expect(existsSync(join(d, '.env.test'))).toBe(true);
    const env = readFileSync(join(d, '.env.test'), 'utf8');
    expect(env).toContain('E2E_ADMIN_EMAIL=admin@newlandnpt.com');
  });

  it('installs the deploy-then-test flows suite (login helper + suite config)', async () => {
    const d = repo();
    await setupE2e({ rootDir: d, dryRun: false });
    expect(existsSync(join(d, 'e2e/flows/_login.ts'))).toBe(true);
    expect(existsSync(join(d, 'e2e/flows/playwright.config.ts'))).toBe(true);
    const login = readFileSync(join(d, 'e2e/flows/_login.ts'), 'utf8');
    expect(login).toContain('export async function login');
    expect(login).not.toContain('truncateAll'); // standalone — no harness/DB
    const cfg = readFileSync(join(d, 'e2e/flows/playwright.config.ts'), 'utf8');
    expect(cfg).not.toMatch(/^\s*webServer\s*:/m); // no webServer property stanza (comments mentioning the word are fine)
  });
});

// UPGRADE: v1 → current (kit-owned files overwritten unconditionally)
describe('setupE2e UPGRADE v1 -> current', () => {
  function v1Repo() {
    const d = mkdtempSync(join(tmpdir(), 'setup-e2e-up-'));
    writeFileSync(join(d, 'playwright.config.ts'), '// next-kit:e2e-bootstrap v1\nexport default {};\n');
    mkdirSync(join(d, 'scripts'), { recursive: true });
    writeFileSync(join(d, 'scripts', 'check-e2e-orphans.mjs'), '// stale v1 orphan script\n');
    mkdirSync(join(d, 'e2e'), { recursive: true });
    writeFileSync(join(d, 'e2e', 'global-setup.ts'), '// USER FILLED THIS IN — will be overwritten (kit-owned)\n');
    writeFileSync(join(d, 'package.json'), '{\n  "scripts": { "test:e2e": "docker compose -f docker-compose.e2e.yml up -d --wait postgres-e2e && prisma migrate deploy && playwright test && node scripts/check-e2e-orphans.mjs" }\n}\n');
    return d;
  }

  it('overwrites kit-owned files, bumps sentinel to current, lands split scripts', async () => {
    const d = v1Repo();
    const s = await setupE2e({ rootDir: d, dryRun: false });
    expect(readFileSync(join(d, 'playwright.config.ts'), 'utf8')).toMatch(/v14/);
    const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8'));
    expect(pkg.scripts['test:e2e:spec']).toContain('playwright test');
    expect(pkg.scripts['check:e2e-orphans']).toContain('check-e2e-orphans.mjs');
    expect(readFileSync(join(d, 'scripts/check-e2e-orphans.mjs'), 'utf8')).toMatch(/E2E_MARKER_ROOTS/);
    expect(existsSync(join(d, 'e2e/docker-compose.e2e.yml'))).toBe(true);
    expect(s.patches.some(p => p.status === 'patched' || p.status === 'noop')).toBe(true);
  });

  it('global-setup.ts is overwritten (kit-owned) on upgrade', async () => {
    const d = v1Repo();
    await setupE2e({ rootDir: d, dryRun: false });
    // kit-owned: the hand-filled content is replaced with the template
    expect(readFileSync(join(d, 'e2e/global-setup.ts'), 'utf8')).not.toMatch(/USER FILLED THIS IN/);
  });

  it('relocates a root docker-compose to e2e/ and overwrites with template (no port preservation)', async () => {
    const d = v1Repo();
    // old root layout with a consumer-edited host port — port is NOT preserved (kit-owned overwrite)
    writeFileSync(join(d, 'docker-compose.e2e.yml'), '# next-kit:e2e-bootstrap v3\nservices:\n  postgres-e2e:\n    ports:\n      - "5433:5432"\n');
    await setupE2e({ rootDir: d, dryRun: false });
    expect(existsSync(join(d, 'docker-compose.e2e.yml'))).toBe(false); // moved out of root
    const placed = readFileSync(join(d, 'e2e/docker-compose.e2e.yml'), 'utf8');
    expect(placed).toContain('# next-kit:e2e-bootstrap v14'); // template sentinel
    // port is now interpolated from .env.test
    expect(placed).toContain('${E2E_PG_HOST_PORT:-5434}');
  });

  it('adds devDeps on upgrade', async () => {
    const d = v1Repo();
    const s = await setupE2e({ rootDir: d, dryRun: false });
    const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8'));
    expect(pkg.devDependencies?.['@playwright/test']).toBeDefined();
  });
});

// RELOCATE: flat per-feature specs → e2e/feature/ (v12 layout)
describe('setupE2e relocate per-feature specs into e2e/feature/', () => {
  it('moves flat per-feature specs under e2e/feature/, leaves _smoke at top-level', async () => {
    const d = repo();
    mkdirSync(join(d, 'e2e'), { recursive: true });
    writeFileSync(join(d, 'e2e', 'orders.spec.ts'), "import { test } from '@playwright/test';\ntest('orders', async () => {});\n");
    await setupE2e({ rootDir: d, dryRun: false });
    expect(existsSync(join(d, 'e2e/feature/orders.spec.ts'))).toBe(true);
    expect(existsSync(join(d, 'e2e/orders.spec.ts'))).toBe(false);
    expect(existsSync(join(d, 'e2e/_smoke.spec.ts'))).toBe(true); // kit canary stays top-level
    expect(existsSync(join(d, 'e2e/feature/_smoke.spec.ts'))).toBe(false); // never relocated
  });

  it('preserves consumer spec contents on relocate (move, not template overwrite)', async () => {
    const d = repo();
    mkdirSync(join(d, 'e2e'), { recursive: true });
    const body = "import { test } from '@playwright/test';\ntest('orders flow', async () => { /* keep me */ });\n";
    writeFileSync(join(d, 'e2e', 'orders.spec.ts'), body);
    await setupE2e({ rootDir: d, dryRun: false });
    expect(readFileSync(join(d, 'e2e/feature/orders.spec.ts'), 'utf8')).toBe(body);
  });

  it('reports relocated specs in filesWritten', async () => {
    const d = repo();
    mkdirSync(join(d, 'e2e'), { recursive: true });
    writeFileSync(join(d, 'e2e', 'orders.spec.ts'), '// x\n');
    const s = await setupE2e({ rootDir: d, dryRun: false });
    expect(s.filesWritten).toContain('e2e/feature/orders.spec.ts');
  });

  it('is a noop once specs already live under e2e/feature/ (idempotent)', async () => {
    const d = repo();
    await setupE2e({ rootDir: d, dryRun: false });
    mkdirSync(join(d, 'e2e/feature'), { recursive: true });
    writeFileSync(join(d, 'e2e/feature/orders.spec.ts'), '// already relocated\n');
    const r = await setupE2e({ rootDir: d, dryRun: false });
    expect(existsSync(join(d, 'e2e/feature/orders.spec.ts'))).toBe(true);
    expect(r.filesWritten).not.toContain('e2e/feature/orders.spec.ts');
  });

  it('dry-run moves nothing', async () => {
    const d = repo();
    mkdirSync(join(d, 'e2e'), { recursive: true });
    writeFileSync(join(d, 'e2e', 'orders.spec.ts'), '// x\n');
    await setupE2e({ rootDir: d, dryRun: true });
    expect(existsSync(join(d, 'e2e/orders.spec.ts'))).toBe(true);
    expect(existsSync(join(d, 'e2e/feature/orders.spec.ts'))).toBe(false);
  });

  it('does not clobber an existing feature/ spec on a name collision; reports it for manual reconcile', async () => {
    const d = repo();
    mkdirSync(join(d, 'e2e/feature'), { recursive: true });
    writeFileSync(join(d, 'e2e', 'orders.spec.ts'), '// flat (stale)\n');
    writeFileSync(join(d, 'e2e/feature/orders.spec.ts'), '// canonical KEEP\n');
    const s = await setupE2e({ rootDir: d, dryRun: false });
    expect(readFileSync(join(d, 'e2e/feature/orders.spec.ts'), 'utf8')).toMatch(/canonical KEEP/); // not overwritten
    expect(existsSync(join(d, 'e2e/orders.spec.ts'))).toBe(true); // flat left in place, not destroyed
    expect(s.patches.some(p => p.status === 'manual' && p.file === 'e2e/orders.spec.ts')).toBe(true);
  });
});

// New tests added by Task 3
test('install → re-run converges (second run idempotent)', async () => {
  const dir = makeRepo();
  await setupE2e({ rootDir: dir, dryRun: false });
  const after1 = readFileSync(join(dir, 'e2e.nextkit.ts'), 'utf8');
  await setupE2e({ rootDir: dir, dryRun: false });
  expect(readFileSync(join(dir, 'e2e.nextkit.ts'), 'utf8')).toBe(after1);
  expect(readFileSync(join(dir, 'playwright.config.ts'), 'utf8')).toMatch(/next-kit:e2e-bootstrap v14/);
});

test('re-assert overwrites a hand-edited kit file at current version', async () => {
  const dir = makeRepo();
  await setupE2e({ rootDir: dir, dryRun: false });
  writeFileSync(join(dir, 'e2e.nextkit.ts'), '// hand-edited\n');
  await setupE2e({ rootDir: dir, dryRun: false });
  expect(readFileSync(join(dir, 'e2e.nextkit.ts'), 'utf8')).not.toMatch(/hand-edited/);
});

test('refuses to downgrade a newer sentinel', async () => {
  const dir = makeRepo();
  writeFileSync(join(dir, 'playwright.config.ts'), '// next-kit:e2e-bootstrap v99\n');
  const r = await setupE2e({ rootDir: dir, dryRun: false });
  expect(r.patches.some(p => p.status === 'manual' && /do not downgrade/.test(p.detail))).toBe(true);
  expect(readFileSync(join(dir, 'playwright.config.ts'), 'utf8')).toMatch(/v99/);
});

test('keep.local.ts written if absent, preserved if present', async () => {
  const dir = makeRepo();
  await setupE2e({ rootDir: dir, dryRun: false });
  writeFileSync(join(dir, 'e2e/keep.local.ts'), 'export const KEEP_LOCAL = ["my_table"];\n');
  await setupE2e({ rootDir: dir, dryRun: false });
  expect(readFileSync(join(dir, 'e2e/keep.local.ts'), 'utf8')).toMatch(/my_table/);
});

test('default install runs nothing (no --verify)', async () => {
  const dir = makeRepo();
  const r = await setupE2e({ rootDir: dir, dryRun: false });
  expect(r.verifyHint).toMatch(/never auto-runs/);
});

test('--verify fails with a pointed error when root .env lacks the auth keys', async () => {
  const dir = makeRepo();   // no root .env
  await expect(setupE2e({ rootDir: dir, dryRun: false, verify: true }))
    .rejects.toThrow(/root \.env missing|file absent/);
});

test('second run writes nothing when already current (no needless overwrite)', async () => {
  const dir = makeRepo();
  await setupE2e({ rootDir: dir, dryRun: false });
  const r2 = await setupE2e({ rootDir: dir, dryRun: false });
  expect(r2.filesWritten).toEqual([]); // no kit-owned file rewritten on a clean re-run
});

test('self-heal still writes a drifted kit file (and reports it)', async () => {
  const dir = makeRepo();
  await setupE2e({ rootDir: dir, dryRun: false });
  writeFileSync(join(dir, 'e2e.nextkit.ts'), '// tampered\n');
  const r = await setupE2e({ rootDir: dir, dryRun: false });
  expect(r.filesWritten).toContain('e2e.nextkit.ts');
  expect(readFileSync(join(dir, 'e2e.nextkit.ts'), 'utf8')).not.toMatch(/tampered/);
});
