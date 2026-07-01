import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setupEslint } from '../src/commands/eslint.ts';

function repo(config: string, name = 'eslint.config.mjs') {
  const d = mkdtempSync(join(tmpdir(), 'setup-eslint-'));
  writeFileSync(join(d, name), config);
  return d;
}

describe('setupEslint', () => {
  it('copies the preset and splices the import on a fresh repo', async () => {
    const d = repo(`export default [\n  { rules: {} },\n];\n`);
    const s = await setupEslint({ rootDir: d, dryRun: false });
    expect(existsSync(join(d, 'eslint.nextkit.mjs'))).toBe(true);
    const cfg = readFileSync(join(d, 'eslint.config.mjs'), 'utf8');
    expect(cfg).toMatch(/nextKitGuardrail/);
    expect(cfg).toMatch(/\/\/ next-kit:eslint-restricted-imports v15/);
    expect(s.patches[0]!.status).toBe('patched');
  });

  it('adds typescript-eslint as a devDependency so the type-aware rule is active', async () => {
    const d = repo(`export default [\n  { rules: {} },\n];\n`);
    writeFileSync(join(d, 'package.json'), '{\n  "name": "x"\n}\n');
    const s = await setupEslint({ rootDir: d, dryRun: false });
    const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8'));
    expect(pkg.devDependencies['typescript-eslint']).toBeTruthy();
    expect(s.patches.some(p => p.file === 'package.json' && p.status === 'patched')).toBe(true);
  });

  it('does not throw when there is no package.json (dep step is skipped)', async () => {
    const d = repo(`export default [\n  { rules: {} },\n];\n`);
    const s = await setupEslint({ rootDir: d, dryRun: false });
    expect(s.patches.some(p => p.file === 'eslint.config.mjs' && p.status === 'patched')).toBe(true);
  });

  it('adds typescript-eslint on an upgrade too (v4 → v15)', async () => {
    const d = repo(
      `import { nextKitGuardrail } from './eslint.nextkit.mjs';\n` +
        `export default [\n  // next-kit:eslint-restricted-imports v4\n  ...nextKitGuardrail(),\n];\n`,
    );
    writeFileSync(join(d, 'package.json'), '{\n  "name": "x"\n}\n');
    await setupEslint({ rootDir: d, dryRun: false });
    const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8'));
    expect(pkg.devDependencies['typescript-eslint']).toBeTruthy();
  });

  it('is a noop on the second run', async () => {
    const d = repo(`export default [\n  { rules: {} },\n];\n`);
    await setupEslint({ rootDir: d, dryRun: false });
    const s = await setupEslint({ rootDir: d, dryRun: false });
    expect(s.patches[0]!.status).toBe('noop');
  });

  it('upgrades a clean older (v4) spread install in place', async () => {
    const d = repo(
      `import { nextKitGuardrail } from './eslint.nextkit.mjs';\n` +
        `export default [\n  // next-kit:eslint-restricted-imports v4\n  ...nextKitGuardrail(),\n];\n`,
    );
    const s = await setupEslint({ rootDir: d, dryRun: false });
    const cfg = readFileSync(join(d, 'eslint.config.mjs'), 'utf8');
    expect(cfg).toMatch(/restricted-imports v15/);
    expect(cfg).not.toMatch(/restricted-imports v4/);
    expect(existsSync(join(d, 'eslint.nextkit.mjs'))).toBe(true); // preset re-copied (delivers the new rule)
    expect(s.patches[0]!.status).toBe('patched');
    expect(s.patches[0]!.detail).toMatch(/upgraded v4/i);
  });

  it('dry-run writes nothing', async () => {
    const d = repo(`export default [];\n`);
    await setupEslint({ rootDir: d, dryRun: true });
    expect(existsSync(join(d, 'eslint.nextkit.mjs'))).toBe(false);
  });

  it('auto-detects monorepo appApi when apps/ exists', async () => {
    const d = repo(`export default [];\n`);
    mkdirSync(join(d, 'apps', 'web'), { recursive: true });
    await setupEslint({ rootDir: d, dryRun: false });
    const cfg = readFileSync(join(d, 'eslint.config.mjs'), 'utf8');
    expect(cfg).toMatch(/apps\/\*\/app\/api/);
  });

  it('throws a clear error when only legacy .eslintrc exists', async () => {
    const d = mkdtempSync(join(tmpdir(), 'setup-eslint-'));
    writeFileSync(join(d, '.eslintrc.json'), '{}');
    await expect(setupEslint({ rootDir: d, dryRun: false })).rejects.toThrow(/flat config/);
  });
});
