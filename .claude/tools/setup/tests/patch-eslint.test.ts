import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectSentinel, spliceGuardrail } from '../src/patch-eslint.ts';

const FIX = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const read = (f: string) => readFileSync(join(FIX, f), 'utf8');
const PARAMS = { appApi: ['apps/*/app/api/**'], packages: 'packages/**' };

// Assert text is syntactically valid by running `node --check` on a temp file.
function assertParses(text: string, ext: string) {
  const d = mkdtempSync(join(tmpdir(), 'splice-'));
  const f = join(d, `cfg.${ext}`);
  writeFileSync(f, text);
  // node --check validates syntax only (module resolution not performed).
  execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
}

describe('detectSentinel', () => {
  it('returns null when absent', () => {
    expect(detectSentinel(read('array.mjs'))).toBeNull();
  });
  it('reads the version from the sentinel comment', () => {
    expect(detectSentinel(read('installed-v4.mjs'))).toEqual({ version: 4 });
    expect(detectSentinel(read('inline-v3.mjs'))).toEqual({ version: 3 });
  });
});

describe('spliceGuardrail', () => {
  for (const [f, ext] of [['array.mjs','mjs'],['defineConfig.mjs','mjs'],['tseslint.mjs','mjs'],['cjs.cjs','cjs']] as const) {
    it(`patches ${f}: adds import + spread + sentinel, output parses`, () => {
      const r = spliceGuardrail(read(f), PARAMS, f);
      expect(r.kind).toBe('patched');
      if (r.kind !== 'patched') return;
      expect(r.text).toMatch(/nextKitGuardrail/);
      expect(r.text).toMatch(/\.\/eslint\.nextkit\.mjs/);
      expect(r.text).toMatch(/\/\/ next-kit:eslint-restricted-imports v15/);
      // Sentinel must be the EXACT single-slash form (regression guard for doubled "//").
      expect(r.text).toMatch(/(^|\n)\s*\/\/ next-kit:eslint-restricted-imports v15(\n|$)/);
      expect(r.text).not.toMatch(/\/\/ \/\/ next-kit/);
      assertParses(r.text, ext);
      // Idempotent: re-splicing the patched output is a noop (sentinel present).
      expect(spliceGuardrail(r.text, PARAMS, f).kind).toBe('noop');
    });
  }
  it('returns noop when the current version is already installed', () => {
    expect(spliceGuardrail(read('installed-v15.mjs'), PARAMS, 'installed-v15.mjs').kind).toBe('noop');
  });
  it('upgrades a clean v14 spread install in place (v14 → current)', () => {
    const r = spliceGuardrail(read('installed-v14.mjs'), PARAMS, 'installed-v14.mjs');
    expect(r.kind).toBe('upgrade');
    if (r.kind === 'upgrade') {
      expect(r.from).toBe(14);
      expect(r.text).toMatch(/restricted-imports v15/);
      expect(r.text).not.toMatch(/restricted-imports v14/);
    }
  });
  it('upgrades a clean v13 spread install in place (v13 → current)', () => {
    const r = spliceGuardrail(read('installed-v13.mjs'), PARAMS, 'installed-v13.mjs');
    expect(r.kind).toBe('upgrade');
    if (r.kind === 'upgrade') {
      expect(r.from).toBe(13);
      expect(r.text).toMatch(/restricted-imports v15/);
      expect(r.text).not.toMatch(/restricted-imports v13/);
    }
  });
  it('upgrades a clean v12 spread install in place (v12 → current)', () => {
    const r = spliceGuardrail(read('installed-v12.mjs'), PARAMS, 'installed-v12.mjs');
    expect(r.kind).toBe('upgrade');
    if (r.kind === 'upgrade') {
      expect(r.from).toBe(12);
      expect(r.text).toMatch(/restricted-imports v15/);
      expect(r.text).not.toMatch(/restricted-imports v12/);
    }
  });
  it('upgrades a clean v11 spread install in place (v11 → current)', () => {
    const r = spliceGuardrail(read('installed-v11.mjs'), PARAMS, 'installed-v11.mjs');
    expect(r.kind).toBe('upgrade');
    if (r.kind === 'upgrade') {
      expect(r.from).toBe(11);
      expect(r.text).toMatch(/restricted-imports v15/);
      expect(r.text).not.toMatch(/restricted-imports v11/);
    }
  });
  it('upgrades a clean v10 spread install in place (v10 → current)', () => {
    const r = spliceGuardrail(read('installed-v10.mjs'), PARAMS, 'installed-v10.mjs');
    expect(r.kind).toBe('upgrade');
    if (r.kind === 'upgrade') {
      expect(r.from).toBe(10);
      expect(r.text).toMatch(/restricted-imports v15/);
      expect(r.text).not.toMatch(/restricted-imports v10/);
    }
  });
  it('upgrades a clean v9 spread install in place (v9 → current)', () => {
    const r = spliceGuardrail(read('installed-v9.mjs'), PARAMS, 'installed-v9.mjs');
    expect(r.kind).toBe('upgrade');
    if (r.kind === 'upgrade') {
      expect(r.from).toBe(9);
      expect(r.text).toMatch(/restricted-imports v15/);
      expect(r.text).not.toMatch(/restricted-imports v9/);
    }
  });
  it('upgrades a clean v8 spread install in place (v8 → current)', () => {
    const r = spliceGuardrail(read('installed-v8.mjs'), PARAMS, 'installed-v8.mjs');
    expect(r.kind).toBe('upgrade');
    if (r.kind === 'upgrade') {
      expect(r.from).toBe(8);
      expect(r.text).toMatch(/restricted-imports v15/);
      expect(r.text).not.toMatch(/restricted-imports v8/);
    }
  });
  it('upgrades a clean v7 spread install in place (v7 → current)', () => {
    const r = spliceGuardrail(read('installed-v7.mjs'), PARAMS, 'installed-v7.mjs');
    expect(r.kind).toBe('upgrade');
    if (r.kind === 'upgrade') {
      expect(r.from).toBe(7);
      expect(r.text).toMatch(/restricted-imports v15/);
      expect(r.text).not.toMatch(/restricted-imports v7/);
    }
  });
  it('upgrades a clean v6 spread install in place (v6 → current)', () => {
    const r = spliceGuardrail(read('installed-v6.mjs'), PARAMS, 'installed-v6.mjs');
    expect(r.kind).toBe('upgrade');
    if (r.kind === 'upgrade') {
      expect(r.from).toBe(6);
      expect(r.text).toMatch(/restricted-imports v15/);
      expect(r.text).not.toMatch(/restricted-imports v6/);
    }
  });
  it('upgrades a clean v5 spread install in place (v5 → current)', () => {
    const r = spliceGuardrail(read('installed-v5.mjs'), PARAMS, 'installed-v5.mjs');
    expect(r.kind).toBe('upgrade');
    if (r.kind === 'upgrade') {
      expect(r.from).toBe(5);
      expect(r.text).toMatch(/restricted-imports v15/);
      expect(r.text).not.toMatch(/restricted-imports v5/);
    }
  });
  it('upgrades a clean older spread install in place (v4 → current, no manual step)', () => {
    const r = spliceGuardrail(read('installed-v4.mjs'), PARAMS, 'installed-v4.mjs');
    expect(r.kind).toBe('upgrade');
    if (r.kind === 'upgrade') {
      expect(r.from).toBe(4);
      expect(r.text).toMatch(/restricted-imports v15/);
      expect(r.text).not.toMatch(/restricted-imports v4/);
    }
  });
  it('returns manual for v3 inline installs (not machine-removable)', () => {
    const r = spliceGuardrail(read('inline-v3.mjs'), PARAMS, 'inline-v3.mjs');
    expect(r.kind).toBe('manual');
    if (r.kind === 'manual') expect(r.instructions).toMatch(/delete/i);
  });
  it('returns manual when the export is not a recognized config shape', () => {
    expect(spliceGuardrail(read('unknown.mjs'), PARAMS, 'unknown.mjs').kind).toBe('manual');
  });
});
