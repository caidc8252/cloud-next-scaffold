import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ORPHAN_SRC = join(dirname(fileURLToPath(import.meta.url)), '../../../context/check-e2e-orphans.mjs');

function monorepoRepo(withMatchingSpec: boolean) {
  const d = mkdtempSync(join(tmpdir(), 'orphans-'));
  mkdirSync(join(d, 'apps', 'web', 'app', 'users'), { recursive: true });
  writeFileSync(join(d, 'apps', 'web', 'app', 'users', 'route.ts'), '// @e2e-cell feature=users kind=route\nexport const GET = () => {};\n');
  mkdirSync(join(d, 'e2e'), { recursive: true });
  if (withMatchingSpec) writeFileSync(join(d, 'e2e', 'users.spec.ts'), "import { test } from '@playwright/test';\ntest('x', async () => {});\n");
  cpSync(ORPHAN_SRC, join(d, 'check-e2e-orphans.mjs'));
  return d;
}

function run(dir: string, markerRoots: string) {
  return execFileSync(process.execPath, ['check-e2e-orphans.mjs'], {
    cwd: dir,
    env: { ...process.env, E2E_MARKER_ROOTS: markerRoots },
    stdio: 'pipe',
  });
}

describe('check-e2e-orphans.mjs E2E_MARKER_ROOTS', () => {
  it('finds monorepo markers under apps/*/app when roots are set (matching spec → exit 0)', () => {
    const d = monorepoRepo(true);
    expect(() => run(d, 'apps/*/src apps/*/app apps/*/middleware.ts')).not.toThrow();
  });

  it('reports an orphan (exit 1) when the monorepo marker has no matching spec', () => {
    const d = monorepoRepo(false);
    expect(() => run(d, 'apps/*/src apps/*/app apps/*/middleware.ts')).toThrow();
  });

  it('defaults to root-level roots (src app middleware.ts) when env unset', () => {
    const d = mkdtempSync(join(tmpdir(), 'orphans-'));
    mkdirSync(join(d, 'app'), { recursive: true });
    writeFileSync(join(d, 'app', 'route.ts'), '// @e2e-cell feature=home kind=route\n');
    mkdirSync(join(d, 'e2e'), { recursive: true });
    writeFileSync(join(d, 'e2e', 'home.spec.ts'), "import { test } from '@playwright/test';\ntest('x', async () => {});\n");
    cpSync(ORPHAN_SRC, join(d, 'check-e2e-orphans.mjs'));
    expect(() => execFileSync(process.execPath, ['check-e2e-orphans.mjs'], { cwd: d, stdio: 'pipe' })).not.toThrow();
  });
});
