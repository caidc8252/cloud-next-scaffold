import { describe, expect, it } from 'vitest';
import { minimatch } from 'minimatch';
// @ts-expect-error — untyped .mjs
import { nextKitGuardrail } from '../../../context/eslint.nextkit.mjs';

type Block = { files?: string[]; ignores?: string[]; rules: Record<string, unknown> };

// Emulate ESLint flat-config matching for a single rule name.
function matches(block: Block, file: string): boolean {
  const inFiles = !block.files || block.files.some(g => minimatch(file, g));
  const inIgnores = !!block.ignores && block.ignores.some(g => minimatch(file, g));
  return inFiles && !inIgnores;
}

const SAMPLES = [
  'apps/web/app/api/users/route.ts',   // route handler
  'apps/web/app/dashboard/page.tsx',   // app code
  'packages/db/src/client.ts',         // db
  'packages/i18n/src/server.ts',       // i18n
  'packages/ui/src/components/ui/modal.tsx', // other package
  'packages/security/src/hash.ts',     // security
  'packages/storage/src/upload.ts',    // storage
  'apps/web/service/orders/server/orders.repository.ts', // data layer → region F only
  'apps/web/app/api/users/users.repository.ts',          // repo under app/api → A only (F ignores appApi)
  'packages/data/src/users.repository.ts',               // repo under packages → E only (F ignores packages)
  'middleware.ts',                                       // middleware → its own import block (carved out of region B)
];

describe('region disjointness (monorepo layout)', () => {
  const cfg = { appApi: ['apps/*/app/api/**'], packages: 'packages/**' };
  function count(rule: string, file: string): number {
    return (nextKitGuardrail(cfg) as Block[]).filter(b => b.rules[rule] && matches(b, file)).length;
  }

  it('every sample file matches exactly one no-restricted-syntax block', () => {
    for (const f of SAMPLES) expect(count('no-restricted-syntax', f), f).toBe(1);
  });

  it('every sample file matches exactly one no-restricted-imports block', () => {
    for (const f of SAMPLES) expect(count('no-restricted-imports', f), f).toBe(1);
  });

  it('default (single-app) layout is also disjoint', () => {
    function countDefault(rule: string, file: string): number {
      return (nextKitGuardrail() as Block[]).filter(b => b.rules[rule] && matches(b, file)).length;
    }
    for (const f of [
      'app/api/x/route.ts', 'app/page.tsx', 'packages/ui/x.tsx',
      'service/orders/server/orders.repository.ts', // region F only
      'app/api/x/x.repository.ts',                  // A only (F ignores appApi)
      'packages/ui/x.repository.ts',                // E only (F ignores packages)
      'middleware.ts',                              // middleware import block only
    ]) {
      expect(countDefault('no-restricted-syntax', f), f).toBe(1);
      expect(countDefault('no-restricted-imports', f), f).toBe(1);
    }
  });
});
