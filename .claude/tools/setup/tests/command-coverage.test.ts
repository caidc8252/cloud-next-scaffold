import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setupCoverage } from '../src/commands/coverage.ts';

function repo(pkg = '{\n  "name": "x",\n  "scripts": {},\n  "devDependencies": { "vitest": "^2.1.0" }\n}\n') {
  const d = mkdtempSync(join(tmpdir(), 'setup-cov-'));
  writeFileSync(join(d, 'package.json'), pkg);
  return d;
}

describe('setupCoverage INSTALL', () => {
  it('scaffolds the script with its sentinel', async () => {
    const d = repo();
    await setupCoverage({ rootDir: d, dryRun: false });
    expect(existsSync(join(d, 'scripts/check-diff-coverage.mjs'))).toBe(true);
    expect(readFileSync(join(d, 'scripts/check-diff-coverage.mjs'), 'utf8')).toMatch(/\/\/ next-kit:diff-coverage v2/);
  });

  it('adds the check:diff-coverage npm script forcing the lcov reporter', async () => {
    const d = repo();
    await setupCoverage({ rootDir: d, dryRun: false });
    const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8'));
    expect(pkg.scripts['check:diff-coverage']).toContain('--coverage.reporter=lcov');
    expect(pkg.scripts['check:diff-coverage']).toContain('node scripts/check-diff-coverage.mjs');
  });

  it('adds @vitest/coverage-v8 matching the consumer vitest major', async () => {
    const d = repo();
    await setupCoverage({ rootDir: d, dryRun: false });
    const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8'));
    expect(pkg.devDependencies['@vitest/coverage-v8']).toBe('^2.1.0');
  });

  it('matches the vitest v3 major', async () => {
    const d = repo('{\n  "scripts": {},\n  "devDependencies": { "vitest": "^3.2.0" }\n}\n');
    await setupCoverage({ rootDir: d, dryRun: false });
    const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8'));
    expect(pkg.devDependencies['@vitest/coverage-v8']).toBe('^3.1.0');
  });

  it('falls back to a default range when vitest is absent', async () => {
    const d = repo('{\n  "scripts": {}\n}\n');
    await setupCoverage({ rootDir: d, dryRun: false });
    const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8'));
    expect(pkg.devDependencies['@vitest/coverage-v8']).toBe('^2.1.0');
  });

  it('does not override an existing coverage provider pin', async () => {
    const d = repo('{\n  "scripts": {},\n  "devDependencies": { "vitest": "^2.1.0", "@vitest/coverage-v8": "^2.0.5" }\n}\n');
    await setupCoverage({ rootDir: d, dryRun: false });
    const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8'));
    expect(pkg.devDependencies['@vitest/coverage-v8']).toBe('^2.0.5');
  });

  it('gitignores coverage/', async () => {
    const d = repo();
    await setupCoverage({ rootDir: d, dryRun: false });
    expect(readFileSync(join(d, '.gitignore'), 'utf8')).toMatch(/coverage\//);
  });

  it('dry-run writes nothing', async () => {
    const d = repo();
    await setupCoverage({ rootDir: d, dryRun: true });
    expect(existsSync(join(d, 'scripts/check-diff-coverage.mjs'))).toBe(false);
  });
});

describe('setupCoverage IDEMPOTENCE', () => {
  it('is a noop when already at the current sentinel', async () => {
    const d = repo();
    await setupCoverage({ rootDir: d, dryRun: false });
    const s = await setupCoverage({ rootDir: d, dryRun: false });
    expect(s.patches.find(p => p.file === 'scripts/check-diff-coverage.mjs')?.status).toBe('noop');
  });

  it('flags a hand-rolled script without a sentinel as manual', async () => {
    const d = repo();
    mkdirSync(join(d, 'scripts'), { recursive: true });
    writeFileSync(join(d, 'scripts/check-diff-coverage.mjs'), '// custom\n');
    const s = await setupCoverage({ rootDir: d, dryRun: false });
    expect(s.patches.find(p => p.file === 'scripts/check-diff-coverage.mjs')?.status).toBe('manual');
  });
});
