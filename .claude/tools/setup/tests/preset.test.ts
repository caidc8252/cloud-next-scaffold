import { describe, expect, it } from 'vitest';
// @ts-expect-error — .mjs preset has no types; we assert structure at runtime.
import { nextKitGuardrail, typeAwareBlock } from '../../../context/eslint.nextkit.mjs';

type Block = {
  files?: string[];
  ignores?: string[];
  rules: Record<string, unknown>;
};

const cfg = (): Block[] => nextKitGuardrail();

function syntaxSelectors(b: Block): string[] {
  const rule = b.rules['no-restricted-syntax'] as [string, ...{ selector: string }[]];
  return rule.slice(1).map(o => (o as { selector: string }).selector);
}
function importNames(b: Block): string[] {
  const rule = b.rules['no-restricted-imports'] as [string, { paths?: { name: string }[] }];
  return (rule[1].paths ?? []).map(p => p.name);
}
function importPatternGroups(b: Block): string[] {
  const rule = b.rules['no-restricted-imports'] as [string, { patterns?: { group: string[] }[] }];
  return (rule[1].patterns ?? []).flatMap(p => p.group);
}

describe('nextKitGuardrail region coverage', () => {
  it('region A (route handlers) bans @cloud/db and the data layer (repository/mapper)', () => {
    const a = cfg().find(b => Array.isArray(b.files) && b.files.some(f => f.includes('api')) && b.rules['no-restricted-imports'])!;
    expect(importNames(a)).toContain('@cloud/db');
    const groups = importPatternGroups(a);
    expect(groups.some(g => g.includes('repository'))).toBe(true);
    expect(groups.some(g => g.includes('mapper'))).toBe(true);
    // still carries the full global path bans (regression: region A is a superset)
    expect(importNames(a)).toContain('argon2');
  });

  it('region A (route handlers) bans Response.json AND the full app set', () => {
    const a = cfg().find(b => Array.isArray(b.files) && b.files.some(f => f.includes('api')) && b.rules['no-restricted-syntax'])!;
    const sels = syntaxSelectors(a);
    expect(sels.some(s => s.includes("name='Response'"))).toBe(true);
    expect(sels.some(s => s.includes("name='NextResponse'"))).toBe(true);
    expect(sels.some(s => s.includes('PrismaClient'))).toBe(true);
    expect(sels.some(s => s.includes("directive='use server'"))).toBe(true);
    expect(sels.some(s => s.includes('asChild'))).toBe(true);
  });

  it('region B (app code) bans the app set but NOT Response.json', () => {
    const b = cfg().find(x => x.ignores?.some(i => i.startsWith('packages')) && !x.files && x.rules['no-restricted-syntax'])!;
    const sels = syntaxSelectors(b);
    expect(sels.some(s => s.includes('PrismaClient'))).toBe(true);
    // onOpenChange ban is scoped to <Modal> (base-ui wrappers keep it) — issue #16
    expect(sels.some(s => s.includes('onOpenChange') && s.includes("name='Modal'"))).toBe(true);
    expect(sels.some(s => s.includes("name='Response'"))).toBe(false);
    expect(sels.some(s => s.includes("name='NextResponse'"))).toBe(false);
  });

  it('data-layer region carries the query rules plus the full app set (superset of region B)', () => {
    const repo = cfg().find(b => b.files?.some(f => f.includes('repository')) && b.rules['no-restricted-syntax'])!;
    const sels = syntaxSelectors(repo);
    expect(sels.some(s => s.includes('findMany'))).toBe(true);            // rule 1: raw-SQL reads
    expect(sels.some(s => s.includes("property.name='$transaction'"))).toBe(true); // rule 2: no read txn
    expect(sels.some(s => s.includes('PrismaClient'))).toBe(true);        // still carries the app set
    expect(sels.some(s => s.includes("directive='use server'"))).toBe(true);
  });

  it('region B excludes the data layer so a repository file matches exactly one block', () => {
    const b = cfg().find(x => x.ignores?.some(i => i.startsWith('packages')) && !x.files && x.rules['no-restricted-syntax'])!;
    expect(b.ignores?.some(i => i.includes('repository'))).toBe(true);
  });

  it('packages/i18n keeps the PrismaClient ban; packages/db drops it', () => {
    const blocks = cfg().filter(b => b.rules['no-restricted-syntax']);
    const i18n = blocks.find(b => b.files?.some(f => f.includes('i18n')))!;
    const db = blocks.find(b => b.files?.some(f => f.includes('db')) && !b.ignores)!;
    expect(syntaxSelectors(i18n).some(s => s.includes('PrismaClient'))).toBe(true);
    expect(syntaxSelectors(i18n).some(s => s.includes("directive='use server'"))).toBe(false);
    expect(syntaxSelectors(db).some(s => s.includes('PrismaClient'))).toBe(false);
    expect(syntaxSelectors(db).some(s => s.includes("directive='use server'"))).toBe(true);
  });

  it('region B carries the content-height-size ban (Button/Toggle) as a literal+template pair', () => {
    const b = cfg().find(x => x.ignores?.some(i => i.startsWith('packages')) && !x.files && x.rules['no-restricted-syntax'])!;
    const height = syntaxSelectors(b).filter(s => s.includes('Button|Toggle') && s.includes('auto|fit|min|max'));
    expect(height.length).toBe(2); // Literal + TemplateElement, mirroring the arbitrary-value pair
    expect(height.some(s => s.includes('Literal'))).toBe(true);
    expect(height.some(s => s.includes('TemplateElement'))).toBe(true);
  });

  it('no package region carries base-ui or styling selectors', () => {
    const pkgBlocks = cfg().filter(b => b.files?.some(f => f.startsWith('packages')) && b.rules['no-restricted-syntax']);
    for (const b of pkgBlocks) {
      const sels = syntaxSelectors(b);
      expect(sels.some(s => s.includes('asChild') || s.includes('className'))).toBe(false);
    }
  });

  it('global imports ban argon2; packages/security relaxes it', () => {
    const imp = cfg().filter(b => b.rules['no-restricted-imports']);
    const global = imp.find(b => b.ignores?.some(i => i.includes('security')) && !b.files)!;
    const security = imp.find(b => b.files?.some(f => f.includes('security')))!;
    expect(importNames(global)).toContain('argon2');
    expect(importNames(security)).not.toContain('argon2');
    expect(importNames(security)).toContain('styled-components');
  });

  it('global imports ban the AWS SDK; packages/storage relaxes it', () => {
    const imp = cfg().filter(b => b.rules['no-restricted-imports']);
    const global = imp.find(b => b.ignores?.some(i => i.includes('storage')) && !b.files)!;
    const storage = imp.find(b => b.files?.some(f => f.includes('storage')))!;
    expect(importNames(global)).toContain('@aws-sdk/client-s3');
    expect(importNames(global)).toContain('@aws-sdk/client-sts');
    expect(importNames(storage)).not.toContain('@aws-sdk/client-s3');
    expect(importNames(storage)).toContain('styled-components');
  });

  it('exposes the require-e2e-cell rule for route handlers and middleware', () => {
    type CellBlock = { files: string[]; rules: Record<string, unknown>; plugins: Record<string, { rules: Record<string, unknown> }> };
    const block = cfg().find(b => (b as { plugins?: unknown }).plugins) as unknown as CellBlock | undefined;
    expect(block).toBeDefined();
    expect(block!.rules['next-kit/require-e2e-cell']).toBe('error');
    expect(block!.files.some(f => f.includes('route'))).toBe(true);
    expect(block!.files.some(f => f.includes('middleware'))).toBe(true);
    const plugin = block!.plugins['next-kit'];
    expect(plugin).toBeDefined();
    expect(Object.keys(plugin!.rules)).toContain('require-e2e-cell');
  });

  it('exposes the stub-notice rule (warn) for *.stub.* files', () => {
    type StubBlock = { files?: string[]; rules: Record<string, unknown>; plugins?: Record<string, { rules: Record<string, unknown> }> };
    const block = (cfg() as StubBlock[]).find(b => b.rules['next-kit/stub-notice']);
    expect(block).toBeDefined();
    // warn, NOT error: a stub is legitimately present mid-development — it must
    // announce itself via `pnpm lint` without failing the build.
    expect(block!.rules['next-kit/stub-notice']).toBe('warn');
    expect(block!.files?.some(f => f.includes('stub'))).toBe(true);
    const plugin = block!.plugins!['next-kit'];
    expect(plugin).toBeDefined();
    expect(Object.keys(plugin!.rules)).toContain('stub-notice');
  });

  it('exposes the error-code-module-collision rule for *-error-codes files', () => {
    type ECBlock = { files?: string[]; rules: Record<string, unknown>; plugins?: Record<string, { rules: Record<string, unknown> }> };
    const block = (cfg() as ECBlock[]).find(b => b.rules['next-kit/error-code-module-collision']);
    expect(block).toBeDefined();
    expect(block!.rules['next-kit/error-code-module-collision']).toBe('error');
    expect(block!.files?.some(f => f.includes('error-codes'))).toBe(true);
    const plugin = block!.plugins!['next-kit'];
    expect(plugin).toBeDefined();
    expect(Object.keys(plugin!.rules)).toContain('error-code-module-collision');
  });
});

describe('type-aware rule (@typescript-eslint/no-deprecated)', () => {
  it('typeAwareBlock wires the parser, projectService, and the rule', () => {
    const b = typeAwareBlock({ parser: 'PARSER', plugin: 'PLUGIN' }, ['app/**/*.{ts,tsx,mts,cts}']) as {
      files: string[];
      languageOptions: { parser: string; parserOptions: { projectService: boolean } };
      plugins: Record<string, string>;
      rules: Record<string, string>;
    };
    expect(b.files).toContain('app/**/*.{ts,tsx,mts,cts}');
    expect(b.languageOptions.parser).toBe('PARSER');
    expect(b.languageOptions.parserOptions.projectService).toBe(true);
    expect(b.plugins['@typescript-eslint']).toBe('PLUGIN');
    expect(b.rules['@typescript-eslint/no-deprecated']).toBe('error');
  });

  it('degrades gracefully when typescript-eslint is not installed', () => {
    // The dep is absent in this kit package, so the lazy block drops out: no
    // @typescript-eslint plugin block, and the syntax/import regions stay intact.
    const blocks = cfg() as { plugins?: Record<string, unknown>; rules: Record<string, unknown> }[];
    expect(blocks.some(b => b.plugins?.['@typescript-eslint'])).toBe(false);
    expect(blocks.some(b => b.rules['no-restricted-syntax'])).toBe(true);
  });
});
