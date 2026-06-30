import { describe, expect, it, test } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { addPackageScript, addDevDependency, appendGitignore, setPackageScript } from '../src/patch-json.ts';

function tmp() {
  return mkdtempSync(join(tmpdir(), 'patch-json-'));
}

describe('addPackageScript', () => {
  it('adds a new script and preserves existing ones + formatting', () => {
    const d = tmp();
    writeFileSync(join(d, 'package.json'), '{\n  "name": "x",\n  "scripts": {\n    "build": "tsc"\n  }\n}\n');
    const r = addPackageScript(d, 'test:e2e', 'playwright test');
    expect(r.kind).toBe('patched');
    const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8'));
    expect(pkg.scripts['test:e2e']).toBe('playwright test');
    expect(pkg.scripts.build).toBe('tsc'); // preserved
  });

  it('creates the scripts object when absent', () => {
    const d = tmp();
    writeFileSync(join(d, 'package.json'), '{\n  "name": "x"\n}\n');
    addPackageScript(d, 'test:e2e', 'playwright test');
    const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8'));
    expect(pkg.scripts['test:e2e']).toBe('playwright test');
  });

  it('is a noop when the identical script already exists', () => {
    const d = tmp();
    writeFileSync(join(d, 'package.json'), '{\n  "scripts": { "test:e2e": "playwright test" }\n}\n');
    expect(addPackageScript(d, 'test:e2e', 'playwright test').kind).toBe('noop');
  });

  it('reports a conflict when the script exists with a different value', () => {
    const d = tmp();
    writeFileSync(join(d, 'package.json'), '{\n  "scripts": { "test:e2e": "vitest" }\n}\n');
    const r = addPackageScript(d, 'test:e2e', 'playwright test');
    expect(r.kind).toBe('conflict');
    if (r.kind === 'conflict') expect(r.existing).toBe('vitest');
  });
});

describe('addDevDependency', () => {
  it('adds to devDependencies, creating the bucket, preserving formatting', () => {
    const d = tmp();
    writeFileSync(join(d, 'package.json'), '{\n  "name": "x"\n}\n');
    const r = addDevDependency(d, '@playwright/test', '^1.49.0');
    expect(r.kind).toBe('patched');
    const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8'));
    expect(pkg.devDependencies['@playwright/test']).toBe('^1.49.0');
  });

  it('is a noop when already declared in devDependencies (keeps the consumer pin)', () => {
    const d = tmp();
    writeFileSync(join(d, 'package.json'), '{\n  "devDependencies": { "dotenv": "^15.0.0" }\n}\n');
    const r = addDevDependency(d, 'dotenv', '^16.4.5');
    expect(r.kind).toBe('noop');
    expect(JSON.parse(readFileSync(join(d, 'package.json'), 'utf8')).devDependencies.dotenv).toBe('^15.0.0');
  });

  it('is a noop when declared in (runtime) dependencies', () => {
    const d = tmp();
    writeFileSync(join(d, 'package.json'), '{\n  "dependencies": { "dotenv": "^16.0.0" }\n}\n');
    expect(addDevDependency(d, 'dotenv', '^16.4.5').kind).toBe('noop');
  });
});

describe('appendGitignore', () => {
  it('appends missing entries, skips present ones, creates the file if absent', () => {
    const d = tmp();
    writeFileSync(join(d, '.gitignore'), 'node_modules\n.e2e/\n');
    const r = appendGitignore(d, ['.e2e/', 'e2e/.auth/', 'playwright-report/', '.env.test']);
    expect(r.kind).toBe('patched');
    const gi = readFileSync(join(d, '.gitignore'), 'utf8');
    expect(gi).toMatch(/e2e\/\.auth\//);
    expect(gi).toMatch(/playwright-report\//);
    expect(gi).toMatch(/\.env\.test/);
    expect(gi.match(/\.e2e\//g)!.length).toBe(1); // not duplicated
  });

  it('creates .gitignore when absent', () => {
    const d = tmp();
    appendGitignore(d, ['.e2e/']);
    expect(existsSync(join(d, '.gitignore'))).toBe(true);
  });

  it('is a noop when all entries are already present', () => {
    const d = tmp();
    writeFileSync(join(d, '.gitignore'), '.e2e/\ne2e/.auth/\n');
    expect(appendGitignore(d, ['.e2e/', 'e2e/.auth/']).kind).toBe('noop');
  });
});

describe('setPackageScript', () => {
  test('overwrites a drifted script', () => {
    const d = tmp();
    writeFileSync(join(d, 'package.json'), '{\n  "scripts": { "test:e2e": "old drifted command" }\n}\n');
    const r = setPackageScript(d, 'test:e2e', 'pnpm test:e2e:spec && pnpm check:e2e-orphans');
    expect(r.kind).toBe('patched');
    expect(JSON.parse(readFileSync(join(d, 'package.json'), 'utf8')).scripts['test:e2e'])
      .toBe('pnpm test:e2e:spec && pnpm check:e2e-orphans');
  });

  test('is a noop when already current', () => {
    const d = tmp();
    writeFileSync(join(d, 'package.json'), '{\n  "scripts": { "test:e2e": "x" }\n}\n');
    expect(setPackageScript(d, 'test:e2e', 'x').kind).toBe('noop');
  });
});
