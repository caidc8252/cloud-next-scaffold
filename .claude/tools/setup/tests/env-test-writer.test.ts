import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, expect } from 'vitest';
import { writeEnvTest } from '../src/commands/e2e.ts';

function tmp(): string { return mkdtempSync(join(tmpdir(), 'envtest-')); }
function parse(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of readFileSync(join(dir, '.env.test'), 'utf8').split('\n')) {
    const i = l.indexOf('='); if (l.trim().startsWith('#') || i <= 0) continue;
    out[l.slice(0, i).trim()] = l.slice(i + 1).trim();
  }
  return out;
}

test('fresh repo: writes all keys with defaults + derived URLs', () => {
  const d = tmp();
  writeEnvTest(d, false);
  const e = parse(d);
  expect(e.E2E_BASE_URL).toBe('http://localhost:3000');
  expect(e.E2E_PORTAL_URL).toBe('http://localhost:3100');
  expect(e.E2E_ADMIN_EMAIL).toBe('admin@newlandnpt.com');
  expect(e.DATABASE_URL).toBe('postgresql://e2e:e2e@localhost:5434/e2e');
  expect(e.REDIS_URL).toBe('redis://localhost:6380');
});

test('fill-missing: preserves a user-edited value', () => {
  const d = tmp();
  writeFileSync(join(d, '.env.test'), 'E2E_ADMIN_PASSWORD=MyOwnPass!9\n');
  writeEnvTest(d, false);
  expect(parse(d).E2E_ADMIN_PASSWORD).toBe('MyOwnPass!9');
});

test('value-gated migration: stale portal E2E_BASE_URL → console origin', () => {
  const d = tmp();
  writeFileSync(join(d, '.env.test'), 'E2E_PORTAL_URL=http://localhost:3100\nE2E_BASE_URL=http://localhost:3100\n');
  writeEnvTest(d, false);
  expect(parse(d).E2E_BASE_URL).toBe('http://localhost:3000');
});

test('value-gated migration: a deliberate non-portal value survives', () => {
  const d = tmp();
  writeFileSync(join(d, '.env.test'), 'E2E_PORTAL_URL=http://localhost:3100\nE2E_BASE_URL=http://localhost:3001\n');
  writeEnvTest(d, false);
  expect(parse(d).E2E_BASE_URL).toBe('http://localhost:3001');
});

test('derived ports follow a custom host-port key', () => {
  const d = tmp();
  writeFileSync(join(d, '.env.test'), 'E2E_PG_HOST_PORT=5999\n');
  writeEnvTest(d, false);
  expect(parse(d).DATABASE_URL).toBe('postgresql://e2e:e2e@localhost:5999/e2e');
});

test('prunes dropped keys (captcha, RSA pubkey, user creds)', () => {
  const d = tmp();
  writeFileSync(join(d, '.env.test'), 'E2E_CAPTCHA_BYPASS_TOKEN=x\nNEXT_PUBLIC_AUTH_LOGIN_RSA_PUBLIC_KEY=y\nE2E_USER_EMAIL=z\n');
  writeEnvTest(d, false);
  const e = parse(d);
  expect(e.E2E_CAPTCHA_BYPASS_TOKEN).toBeUndefined();
  expect(e.NEXT_PUBLIC_AUTH_LOGIN_RSA_PUBLIC_KEY).toBeUndefined();
  expect(e.E2E_USER_EMAIL).toBeUndefined();
});

test('dry-run writes nothing', () => {
  const d = tmp();
  writeEnvTest(d, true);
  expect(existsSync(join(d, '.env.test'))).toBe(false);
});

test('clean re-run is a noop (no needless write)', () => {
  const d = tmp();
  expect(writeEnvTest(d, false).status).toBe('patched'); // first write
  expect(writeEnvTest(d, false).status).toBe('noop');     // identical → noop
});
