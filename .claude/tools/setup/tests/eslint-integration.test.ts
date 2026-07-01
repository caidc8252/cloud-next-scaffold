import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

// Integration guard against the minimatch≠ESLint gap: the preset's `files`
// globs must match real files under ESLint flat config. A bare `packages/**`
// glob matches in minimatch (so the unit tests pass) but NOT under real
// ESLint — the file is "ignored because no matching configuration was
// supplied" and the rules silently never apply. This test computes the real
// resolved config via the ESLint Node API for representative paths.

const PRESET = join(dirname(fileURLToPath(import.meta.url)), '../../../context/eslint.nextkit.mjs');

function consumerRepo(): string {
  const d = mkdtempSync(join(tmpdir(), 'eslint-int-'));
  // A flat config that spreads the preset (single-app defaults).
  writeFileSync(
    join(d, 'eslint.config.mjs'),
    `import { nextKitGuardrail } from ${JSON.stringify(PRESET)};\nexport default nextKitGuardrail();\n`,
  );
  mkdirSync(join(d, 'app', 'api', 'users'), { recursive: true });
  mkdirSync(join(d, 'packages', 'ui', 'src'), { recursive: true });
  mkdirSync(join(d, 'packages', 'db', 'src'), { recursive: true });
  writeFileSync(join(d, 'app', 'api', 'users', 'route.ts'), '');
  writeFileSync(join(d, 'packages', 'ui', 'src', 'modal.tsx'), '');
  writeFileSync(join(d, 'packages', 'db', 'src', 'client.ts'), '');
  return d;
}

function syntaxJson(cfg: { rules?: Record<string, unknown> } | undefined): string {
  return JSON.stringify(cfg?.rules?.['no-restricted-syntax'] ?? []);
}

describe('preset under real ESLint flat config', () => {
  it('applies package-scoped rules to packages/** files (regression: bare globs do not match)', async () => {
    const d = consumerRepo();
    const eslint = new ESLint({ cwd: d, overrideConfigFile: join(d, 'eslint.config.mjs') });

    const uiCfg = await eslint.calculateConfigForFile(join(d, 'packages/ui/src/modal.tsx'));
    const ui = syntaxJson(uiCfg);
    // region E (other packages): PrismaClient + use server, NOT base-ui/styling.
    expect(ui).toContain('PrismaClient');
    expect(ui).toContain("directive='use server'");
    expect(ui).not.toContain('onOpenChange');

    // packages/db (region C): use server only, PrismaClient allowed.
    const dbCfg = await eslint.calculateConfigForFile(join(d, 'packages/db/src/client.ts'));
    const db = syntaxJson(dbCfg);
    expect(db).toContain("directive='use server'");
    expect(db).not.toContain('PrismaClient');
  });

  it('applies route-handler rules to app/api/** files', async () => {
    const d = consumerRepo();
    const eslint = new ESLint({ cwd: d, overrideConfigFile: join(d, 'eslint.config.mjs') });
    const apiCfg = await eslint.calculateConfigForFile(join(d, 'app/api/users/route.ts'));
    const api = syntaxJson(apiCfg);
    expect(api).toContain("name='Response'");
    expect(api).toContain('PrismaClient');
  });
});

describe('next-intl import ban (bare package vs sanctioned subpath)', () => {
  // Regression: a bare `next-intl` group *pattern* uses gitignore semantics and
  // also swallows `next-intl/server`, which the team sanctions. The bare package
  // must be an exact `paths` ban so `/server` stays clean.
  async function intlBans(code: string): Promise<number> {
    const d = consumerRepo();
    const eslint = new ESLint({ cwd: d, overrideConfigFile: join(d, 'eslint.config.mjs') });
    const [res] = await eslint.lintText(code, { filePath: join(d, 'app/api/x/route.ts') });
    return (res?.messages ?? []).filter(m => m.ruleId === 'no-restricted-imports').length;
  }

  it('allows next-intl/server (sanctioned getTranslations/getMessages; tested via a route handler, which carries the full import set)', async () => {
    expect(await intlBans("import { getTranslations } from 'next-intl/server';\nexport function GET(){ return getTranslations(); }")).toBe(0);
  });
  it('bans bare next-intl', async () => {
    expect(await intlBans("import { useTranslations } from 'next-intl';\nexport function GET(){ return null; }")).toBe(1);
  });
  it('bans next-intl/client', async () => {
    expect(await intlBans("import x from 'next-intl/client';\nexport function GET(){ return null; }")).toBe(1);
  });
  it('bans next-intl/navigation (team has no locale routing)', async () => {
    expect(await intlBans("import { Link } from 'next-intl/navigation';\nexport function GET(){ return null; }")).toBe(1);
  });
});

describe('require-e2e-cell (boundary marker presence)', () => {
  async function cellErrors(file: string, code: string): Promise<number> {
    const d = consumerRepo();
    const eslint = new ESLint({ cwd: d, overrideConfigFile: join(d, 'eslint.config.mjs') });
    const [res] = await eslint.lintText(code, { filePath: join(d, file) });
    return (res?.messages ?? []).filter(m => m.ruleId === 'next-kit/require-e2e-cell').length;
  }

  it('flags a route handler with no @e2e-cell marker', async () => {
    expect(await cellErrors('app/api/orders/route.ts',
      'export async function GET() { return new Response(); }')).toBe(1);
  });

  it('passes when the route handler carries a marker', async () => {
    expect(await cellErrors('app/api/orders/route.ts',
      '/** @e2e-cell feature=orders kind=route */\nexport async function GET() { return new Response(); }')).toBe(0);
  });

  it('passes when explicitly opted out with @e2e-cell-skip reason=', async () => {
    expect(await cellErrors('app/api/health/route.ts',
      '/** @e2e-cell-skip reason=trivial health probe */\nexport function GET() { return new Response(); }')).toBe(0);
  });

  it('flags middleware with no marker', async () => {
    expect(await cellErrors('middleware.ts', 'export default function middleware() {}')).toBe(1);
  });

  it('detects a re-exported handler (export { h as GET })', async () => {
    expect(await cellErrors('app/api/orders/route.ts',
      'function h() { return new Response(); }\nexport { h as GET };')).toBe(1);
  });

  it('a bare prose mention of @e2e-cell does NOT satisfy the rule', async () => {
    expect(await cellErrors('app/api/orders/route.ts',
      '// TODO: add @e2e-cell marker\nexport function POST() { return new Response(); }')).toBe(1);
  });

  it('does not flag a non-boundary file (page.tsx)', async () => {
    expect(await cellErrors('app/dashboard/page.tsx',
      'export default function Page() { return null; }')).toBe(0);
  });

  it('does not flag a route file with no HTTP export (helper-only)', async () => {
    expect(await cellErrors('app/api/util/route.ts', 'export const helper = 1;')).toBe(0);
  });
});

describe('error-code module collision (per-app namespace)', () => {
  // The rule reads SIBLING *-error-codes files from disk, so the other files
  // must exist on disk; the file under test is supplied in-memory via lintText.
  function ecRepo(otherFiles: Record<string, string>): string {
    const d = mkdtempSync(join(tmpdir(), 'eslint-ec-'));
    writeFileSync(
      join(d, 'eslint.config.mjs'),
      `import { nextKitGuardrail } from ${JSON.stringify(PRESET)};\nexport default nextKitGuardrail();\n`,
    );
    for (const [rel, content] of Object.entries(otherFiles)) {
      const p = join(d, rel);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, content);
    }
    return d;
  }
  async function collisions(currentRel: string, code: string, otherFiles: Record<string, string> = {}): Promise<string[]> {
    const d = ecRepo(otherFiles);
    mkdirSync(join(d, dirname(currentRel)), { recursive: true }); // ensure the file's dir exists even with no siblings
    const eslint = new ESLint({ cwd: d, overrideConfigFile: join(d, 'eslint.config.mjs') });
    const [res] = await eslint.lintText(code, { filePath: join(d, currentRel) });
    return (res?.messages ?? []).filter(m => m.ruleId === 'next-kit/error-code-module-collision').map(m => m.message);
  }

  it('flags a module a sibling *-error-codes file already owns', async () => {
    const msgs = await collisions('apps/admin/lib/apps-error-codes.ts',
      'export const ERR_X = "103001";',
      { 'apps/admin/lib/auth-error-codes.ts': 'export const ERR_A = "103009";' });
    expect(msgs.length).toBe(1);
    expect(msgs[0]).toContain('module 03');
    expect(msgs[0]).toContain('auth-error-codes.ts');
  });

  it('reports a colliding module ONCE even when the file declares many codes in it', async () => {
    const msgs = await collisions('apps/admin/lib/apps-error-codes.ts',
      'export const A = "103001";\nexport const B = "103002";\nexport const C = "103003";',
      { 'apps/admin/lib/auth-error-codes.ts': 'export const ERR_A = "103001";' });
    expect(msgs.length).toBe(1);
  });

  it('does NOT flag distinct modules across sibling files', async () => {
    const msgs = await collisions('apps/admin/lib/apps-error-codes.ts',
      'export const A = "105001";',
      { 'apps/admin/lib/auth-error-codes.ts': 'export const X = "103001";',
        'apps/admin/lib/account-error-codes.ts': 'export const Y = "104001";' });
    expect(msgs).toEqual([]);
  });

  it('does NOT flag the same module reused in a DIFFERENT app (different directory)', async () => {
    const msgs = await collisions('apps/portal/lib/auth-error-codes.ts',
      'export const A = "103001";',
      { 'apps/admin/lib/auth-error-codes.ts': 'export const X = "103009";' });
    expect(msgs).toEqual([]);
  });

  it('does NOT flag a single error-codes file with no siblings (many codes, one module)', async () => {
    const msgs = await collisions('apps/admin/lib/apps-error-codes.ts',
      'export const A = "105001";\nexport const B = "105002";\nexport const C = "105003";');
    expect(msgs).toEqual([]);
  });

  it('ignores a barrel error-codes.ts sibling that only re-exports (no code literals)', async () => {
    const msgs = await collisions('apps/admin/lib/apps-error-codes.ts',
      'export const A = "105001";',
      { 'apps/admin/lib/error-codes.ts': "export * from './apps-error-codes';" });
    expect(msgs).toEqual([]);
  });

  it('only considers *-error-codes siblings — a regular .ts with a 6-digit literal is ignored', async () => {
    const msgs = await collisions('apps/admin/lib/apps-error-codes.ts',
      'export const A = "103001";',
      { 'apps/admin/lib/constants.ts': 'export const TIMEOUT = "103001";' });
    expect(msgs).toEqual([]);
  });

  it('does not detect codes declared in object form (assignment-only heuristic, documented limitation)', async () => {
    const msgs = await collisions('apps/admin/lib/apps-error-codes.ts',
      'export const codes = { X: "103001" };',
      { 'apps/admin/lib/auth-error-codes.ts': 'export const A = "103009";' });
    expect(msgs).toEqual([]);
  });
});

describe('route handlers cannot import the data layer', () => {
  async function importErrors(file: string, code: string): Promise<string[]> {
    const d = consumerRepo();
    const eslint = new ESLint({ cwd: d, overrideConfigFile: join(d, 'eslint.config.mjs') });
    const [res] = await eslint.lintText(code, { filePath: join(d, file) });
    return (res?.messages ?? []).filter(m => m.ruleId === 'no-restricted-imports').map(m => m.message);
  }

  it('flags @cloud/db imported in a route handler', async () => {
    const msgs = await importErrors('app/api/orders/route.ts',
      `import { prisma } from '@cloud/db';\nexport function GET() { return new Response(); }`);
    expect(msgs.length).toBeGreaterThan(0);
  });

  it('flags a *.repository import in a route handler', async () => {
    const msgs = await importErrors('app/api/orders/route.ts',
      `import { findOrders } from '../../../service/orders/server/orders.repository';\nexport function GET() { return new Response(); }`);
    expect(msgs.length).toBeGreaterThan(0);
  });

  it('flags a *.mapper import in a route handler', async () => {
    const msgs = await importErrors('app/api/orders/route.ts',
      `import { toOrderVO } from '../../../service/orders/server/orders.mapper';\nexport function GET() { return new Response(); }`);
    expect(msgs.length).toBeGreaterThan(0);
  });

  it('does NOT flag the service or schema import in a route handler', async () => {
    const msgs = await importErrors('app/api/orders/route.ts',
      `import { ordersService } from '../../../service/orders/server/orders.service';\nimport { OrdersSchema } from '../../../service/orders/schemas/orders.schema';\nexport function GET() { return new Response(); }`);
    expect(msgs).toEqual([]);
  });

  it('does NOT flag @cloud/db imported outside app/api (the service/data layer)', async () => {
    const msgs = await importErrors('service/orders/server/orders.repository.ts',
      `import { prisma } from '@cloud/db';\nexport const findOrders = () => prisma;`);
    expect(msgs).toEqual([]);
  });
});

// A real consumer establishes .tsx as lintable + supplies a JSX parser
// (via typescript-eslint). The minimal consumerRepo() config does not, so
// .tsx is "ignored, no matching config". jsxRepo() builds a JSX-capable repo
// for selectors that need JSX attributes (className, onOpenChange).
function jsxRepo(): string {
  const d = mkdtempSync(join(tmpdir(), 'eslint-jsx-'));
  writeFileSync(
    join(d, 'eslint.config.mjs'),
    `import { nextKitGuardrail } from ${JSON.stringify(PRESET)};\n` +
      `export default [\n` +
      `  { files: ['**/*.{ts,tsx,js,jsx}'], languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } },\n` +
      `  ...nextKitGuardrail(),\n` +
      `];\n`,
  );
  return d;
}
async function syntaxErrors(file: string, code: string): Promise<string[]> {
  const d = jsxRepo();
  const eslint = new ESLint({ cwd: d, overrideConfigFile: join(d, 'eslint.config.mjs') });
  const [res] = await eslint.lintText(code, { filePath: join(d, file) });
  return (res?.messages ?? []).filter(m => m.ruleId === 'no-restricted-syntax').map(m => m.message);
}

describe('onOpenChange ban is scoped to the Modal wrapper', () => {
  // base-ui's controlled API IS open/onOpenChange; only the team's Modal
  // wrapper renames it to onClose. The selector must flag onOpenChange on
  // <Modal> only — NOT on base-ui-backed wrappers (CommandDialog, Sheet, …)
  // that legitimately forward it. The rule's message is the only one that
  // mentions onClose, so it's the discriminator. Regression for issue #16.
  const flagsOnClose = (msgs: string[]) => msgs.some(m => m.includes('onClose'));

  it('flags onOpenChange on <Modal> (it wants onClose)', async () => {
    const msgs = await syntaxErrors('app/components/dialog.tsx',
      'export const X = () => <Modal open onOpenChange={() => {}} />;');
    expect(flagsOnClose(msgs)).toBe(true);
  });

  it('does NOT flag onOpenChange on <CommandDialog> (base-ui native)', async () => {
    const msgs = await syntaxErrors('app/components/palette.tsx',
      'export const X = () => <CommandDialog open onOpenChange={() => {}}>x</CommandDialog>;');
    expect(flagsOnClose(msgs)).toBe(false);
  });

  it('does NOT flag onOpenChange on <Sheet> (base-ui native)', async () => {
    const msgs = await syntaxErrors('app/components/panel.tsx',
      'export const X = () => <Sheet open onOpenChange={() => {}}>x</Sheet>;');
    expect(flagsOnClose(msgs)).toBe(false);
  });

  it('does NOT flag a base-ui dialog NESTED inside <Modal> (direct-child selector, not descendant)', async () => {
    const msgs = await syntaxErrors('app/components/nested.tsx',
      'export const X = () => <Modal open onClose={() => {}}><CommandDialog open onOpenChange={() => {}}>x</CommandDialog></Modal>;');
    expect(flagsOnClose(msgs)).toBe(false);
  });
});

describe('native <table> is banned (the visual gate cannot see the substitution)', () => {
  const flagsTable = (m: string[]) => m.some(x => x.includes('Table<R>'));

  it('flags native <table>', async () => {
    const msgs = await syntaxErrors('app/components/grid.tsx',
      'export const X = () => <table><tbody><tr><td>a</td></tr></tbody></table>;');
    expect(flagsTable(msgs)).toBe(true);
  });

  it('does NOT flag the <Table> primitive', async () => {
    const msgs = await syntaxErrors('app/components/grid.tsx',
      'export const X = () => <Table columns={[]} rows={[]} rowKey="id" />;');
    expect(flagsTable(msgs)).toBe(false);
  });
});

describe('hand-rolled ARIA role is banned (the visual gate cannot see the substitution)', () => {
  // Sibling to the native-<table> ban: that catches native semantic TAGS;
  // this catches the other half of the substitution — a <div role="grid"> (etc.)
  // re-implementing a @cloud/ui primitive. A token-styled role-div is
  // pixel-identical to the primitive, so the visual gate is blind to it.
  const flagsRole = (m: string[]) => m.some(x => x.includes('Hand-rolled ARIA role'));

  it('flags a hand-rolled grid (<div role="grid">)', async () => {
    const msgs = await syntaxErrors('app/components/grid.tsx',
      'export const X = () => <div role="grid"><div role="row"><div role="gridcell">a</div></div></div>;');
    expect(flagsRole(msgs)).toBe(true);
  });

  it('flags a hand-rolled select (<div role="listbox">)', async () => {
    const msgs = await syntaxErrors('app/components/picker.tsx',
      'export const X = () => <div role="listbox"><div role="option">a</div></div>;');
    expect(flagsRole(msgs)).toBe(true);
  });

  it('flags a hand-rolled dialog (<div role="dialog">)', async () => {
    const msgs = await syntaxErrors('app/components/sheet.tsx',
      'export const X = () => <div role="dialog">x</div>;');
    expect(flagsRole(msgs)).toBe(true);
  });

  it('flags a role on a non-div host (role="tab" on a span)', async () => {
    const msgs = await syntaxErrors('app/components/tabs.tsx',
      'export const X = () => <span role="tab">x</span>;');
    expect(flagsRole(msgs)).toBe(true);
  });

  it('does NOT flag the <Table> primitive (no role attribute)', async () => {
    const msgs = await syntaxErrors('app/components/grid.tsx',
      'export const X = () => <Table columns={[]} rows={[]} rowKey="id" />;');
    expect(flagsRole(msgs)).toBe(false);
  });

  it('does NOT flag a landmark role (role="navigation" maps to no primitive)', async () => {
    const msgs = await syntaxErrors('app/components/nav.tsx',
      'export const X = () => <nav role="navigation">x</nav>;');
    expect(flagsRole(msgs)).toBe(false);
  });

  it('does NOT flag the ambiguous role="button" (excluded to avoid false positives)', async () => {
    const msgs = await syntaxErrors('app/components/click.tsx',
      'export const X = () => <div role="button">x</div>;');
    expect(flagsRole(msgs)).toBe(false);
  });

  it('does NOT flag a host with no role', async () => {
    const msgs = await syntaxErrors('app/components/box.tsx',
      'export const X = () => <div className="flex">x</div>;');
    expect(flagsRole(msgs)).toBe(false);
  });

  it('does NOT flag a dynamic role={expr} (same name-match limit as the other selectors)', async () => {
    const msgs = await syntaxErrors('app/components/dyn.tsx',
      'export const X = ({r}) => <div role={r}>x</div>;');
    expect(flagsRole(msgs)).toBe(false);
  });

  it('does NOT flag a custom component\'s `role` PROP with an ARIA-token value (lowercase-host scoping)', async () => {
    const msgs = await syntaxErrors('app/components/field.tsx',
      'export const X = () => <Field role="checkbox" label="x" />;');
    expect(flagsRole(msgs)).toBe(false);
  });

  it('does NOT flag another Capitalized-component role prop (regression for the stress-test false positive)', async () => {
    const msgs = await syntaxErrors('app/components/list.tsx',
      'export const X = () => <ListEntry role="option" />;');
    expect(flagsRole(msgs)).toBe(false);
  });
});

describe('data-layer query rules (repository region)', () => {
  async function repoSyntax(code: string, file = 'service/orders/server/orders.repository.ts'): Promise<string[]> {
    const d = consumerRepo();
    const eslint = new ESLint({ cwd: d, overrideConfigFile: join(d, 'eslint.config.mjs') });
    const [res] = await eslint.lintText(code, { filePath: join(d, file) });
    return (res?.messages ?? []).filter(m => m.ruleId === 'no-restricted-syntax').map(m => m.message);
  }
  const flagsRawQuery = (m: string[]) => m.some(x => x.includes('query builder'));
  const flagsReadTxn = (m: string[]) => m.some(x => x.includes('consistent snapshot'));

  // Rule 1 — reads use raw SQL, not the query builder.
  it('flags a query-builder read in a repository', async () => {
    expect(flagsRawQuery(await repoSyntax('export const f = () => prisma.user.findMany();'))).toBe(true);
  });
  it('does NOT flag prisma.$queryRaw (the prescribed read form)', async () => {
    expect(flagsRawQuery(await repoSyntax('export const f = () => prisma.$queryRaw`SELECT 1`;'))).toBe(false);
  });
  it('does NOT flag a builder WRITE — writes keep the builder', async () => {
    expect(flagsRawQuery(await repoSyntax('export const f = () => prisma.user.update({});'))).toBe(false);
  });
  it('is scoped to the data layer — the same read in a service file is not flagged', async () => {
    expect(flagsRawQuery(await repoSyntax('export const f = () => prisma.user.findMany();', 'service/orders/server/orders.service.ts'))).toBe(false);
  });

  // Rule 2 — reads never run in a transaction (a real transaction has a write).
  it('flags multiple reads wrapped in a transaction', async () => {
    expect(flagsReadTxn(await repoSyntax('export const f = () => prisma.$transaction([prisma.$queryRaw`SELECT 1`, prisma.$queryRaw`SELECT 2`]);'))).toBe(true);
  });
  it('does NOT flag a transaction containing a builder write', async () => {
    expect(flagsReadTxn(await repoSyntax('export const f = () => prisma.$transaction(async (tx) => { await tx.user.update({}); await tx.audit.create({}); });'))).toBe(false);
  });
  it('does NOT flag a transaction whose write is a raw $executeRaw tagged template', async () => {
    expect(flagsReadTxn(await repoSyntax('export const f = () => prisma.$transaction([prisma.$executeRaw`UPDATE x SET y = 1`]);'))).toBe(false);
  });
  it('still flags a read transaction with an incidental non-prisma write-named call (anchored detection)', async () => {
    // `seen.delete(1)` must NOT count as a write — write-detection is anchored on the prisma/tx base.
    expect(flagsReadTxn(await repoSyntax('export const f = (seen) => prisma.$transaction(async (tx) => { seen.delete(1); await tx.$queryRaw`SELECT 1`; });'))).toBe(true);
  });
});

describe('h-auto-size ban (Button/Toggle content-driven height → size="auto")', () => {
  const flagsHauto = (msgs: string[]) => msgs.some(m => m.includes('size="auto"'));

  it('flags className="h-auto" on <Button>', async () => {
    const msgs = await syntaxErrors('app/components/row.tsx',
      'export const X = () => <Button className="h-auto">x</Button>;');
    expect(flagsHauto(msgs)).toBe(true);
  });

  it('flags className="h-auto" on <Toggle>', async () => {
    const msgs = await syntaxErrors('app/components/chip.tsx',
      'export const X = () => <Toggle className="gap-2 h-auto">x</Toggle>;');
    expect(flagsHauto(msgs)).toBe(true);
  });

  it('flags the rest of the content-height family (h-fit/h-min/h-max)', async () => {
    for (const cls of ['h-fit', 'h-min', 'h-max']) {
      const msgs = await syntaxErrors('app/components/row.tsx',
        `export const X = () => <Button className="${cls}">x</Button>;`);
      expect(flagsHauto(msgs), cls).toBe(true);
    }
  });

  it('does NOT flag the important force-override h-fit!', async () => {
    const msgs = await syntaxErrors('app/components/row.tsx',
      'export const X = () => <Button className="h-fit!">x</Button>;');
    expect(flagsHauto(msgs)).toBe(false);
  });

  it('flags h-auto inside a cn() call (literal arg)', async () => {
    const msgs = await syntaxErrors('app/components/row.tsx',
      'export const X = ({c}) => <Button className={cn("h-auto", c)}>x</Button>;');
    expect(flagsHauto(msgs)).toBe(true);
  });

  it('flags h-auto in a template className', async () => {
    const msgs = await syntaxErrors('app/components/row.tsx',
      'export const X = ({c}) => <Button className={`h-auto ${c}`}>x</Button>;');
    expect(flagsHauto(msgs)).toBe(true);
  });

  it('does NOT flag the important force-override h-auto! (Tailwind v4)', async () => {
    const msgs = await syntaxErrors('app/components/row.tsx',
      'export const X = () => <Button className="h-auto!">x</Button>;');
    expect(flagsHauto(msgs)).toBe(false);
  });

  it('does NOT flag the important force-override !h-auto (Tailwind v3)', async () => {
    const msgs = await syntaxErrors('app/components/row.tsx',
      'export const X = () => <Button className="!h-auto">x</Button>;');
    expect(flagsHauto(msgs)).toBe(false);
  });

  it('does NOT flag h-auto on a native/other element (scoped to Button/Toggle)', async () => {
    const msgs = await syntaxErrors('app/components/box.tsx',
      'export const X = () => <div className="h-auto" />;');
    expect(flagsHauto(msgs)).toBe(false);
  });

  it('does NOT flag ToggleGroup (anchored name — only exact Button/Toggle)', async () => {
    const msgs = await syntaxErrors('app/components/group.tsx',
      'export const X = () => <ToggleGroup className="h-auto">x</ToggleGroup>;');
    expect(flagsHauto(msgs)).toBe(false);
  });

  it('does NOT false-positive on a substring like min-h-auto', async () => {
    const msgs = await syntaxErrors('app/components/row.tsx',
      'export const X = () => <Button className="min-h-auto">x</Button>;');
    expect(flagsHauto(msgs)).toBe(false);
  });
});

describe('arbitrary-value ban is total (v9 — no w-/h- exemption)', () => {
  const flagsArbitrary = (msgs: string[]) => msgs.some(m => m.includes('No arbitrary Tailwind values'));

  it('flags an arbitrary width (literal className)', async () => {
    const msgs = await syntaxErrors('app/components/filter.tsx',
      'export const X = () => <div className="w-[180px] flex" />;');
    expect(flagsArbitrary(msgs)).toBe(true);
  });

  it('flags an arbitrary width (template className)', async () => {
    const msgs = await syntaxErrors('app/components/filter.tsx',
      'export const X = () => <div className={`max-w-[459px] flex`} />;');
    expect(flagsArbitrary(msgs)).toBe(true);
  });

  it('does NOT flag scale classes', async () => {
    const msgs = await syntaxErrors('app/components/filter.tsx',
      'export const X = () => <div className="w-40 max-w-3xl gap-5" />;');
    expect(flagsArbitrary(msgs)).toBe(false);
  });

  it('still flags non-width arbitrary values (regression)', async () => {
    const msgs = await syntaxErrors('app/components/filter.tsx',
      'export const X = () => <div className="bg-[#fff]" />;');
    expect(flagsArbitrary(msgs)).toBe(true);
  });
});

// ---- v12: package-skill traps promoted from prose to lint -------------------

describe('mail import ban (N1 — never SMTP/SES from app code)', () => {
  async function importErrors(file: string, code: string): Promise<string[]> {
    const d = consumerRepo();
    const eslint = new ESLint({ cwd: d, overrideConfigFile: join(d, 'eslint.config.mjs') });
    const [res] = await eslint.lintText(code, { filePath: join(d, file) });
    return (res?.messages ?? []).filter(m => m.ruleId === 'no-restricted-imports').map(m => m.message);
  }
  // Use a route handler path: region A carries the full ALL_PATHS bans, and the
  // minimal consumerRepo only lints files matched by a `files` block (app/api/**).
  it('flags nodemailer', async () => {
    const msgs = await importErrors('app/api/notify/route.ts', `import nodemailer from 'nodemailer';\nexport function POST() { return new Response(); }`);
    expect(msgs.some(m => m.includes('@cloud/mail'))).toBe(true);
  });
  it('flags @aws-sdk/client-ses', async () => {
    const msgs = await importErrors('app/api/notify/route.ts', `import { SESClient } from '@aws-sdk/client-ses';\nexport function POST() { return new Response(); }`);
    expect(msgs.some(m => m.includes('@cloud/mail'))).toBe(true);
  });
});

describe('no-console in server code (N2)', () => {
  async function consoleErrors(file: string, code: string): Promise<number> {
    const d = consumerRepo();
    const eslint = new ESLint({ cwd: d, overrideConfigFile: join(d, 'eslint.config.mjs') });
    const [res] = await eslint.lintText(code, { filePath: join(d, file) });
    return (res?.messages ?? []).filter(m => m.ruleId === 'no-console').length;
  }
  it('flags console.log in a route handler', async () => {
    expect(await consoleErrors('app/api/x/route.ts', 'export function GET() { console.log("x"); return new Response(); }')).toBeGreaterThan(0);
  });
  it('flags console.log in a service file', async () => {
    expect(await consoleErrors('service/orders/server/orders.service.ts', 'export const f = () => { console.log("x"); };')).toBeGreaterThan(0);
  });
  it('flags console.log in a repository file', async () => {
    expect(await consoleErrors('service/orders/server/orders.repository.ts', 'export const f = () => { console.error("x"); };')).toBeGreaterThan(0);
  });
  it('does NOT flag console in an RSC page (scoping is deliberately server-dirs-only)', async () => {
    expect(await consoleErrors('app/dashboard/page.ts', 'export const f = () => { console.log("x"); };')).toBe(0);
  });
});

describe('prisma rebind ban (N3 — closes the data-layer anchor blind spot)', () => {
  async function repoSyntax(code: string, file = 'service/orders/server/orders.repository.ts'): Promise<string[]> {
    const d = consumerRepo();
    const eslint = new ESLint({ cwd: d, overrideConfigFile: join(d, 'eslint.config.mjs') });
    const [res] = await eslint.lintText(code, { filePath: join(d, file) });
    return (res?.messages ?? []).filter(m => m.ruleId === 'no-restricted-syntax').map(m => m.message);
  }
  const flagsRebind = (m: string[]) => m.some(x => x.includes('alias or destructure'));
  it('flags an alias (const db = prisma)', async () => {
    expect(flagsRebind(await repoSyntax('export const f = () => { const db = prisma; return db; };'))).toBe(true);
  });
  it('flags a destructure (const { user } = prisma)', async () => {
    expect(flagsRebind(await repoSyntax('export const f = () => { const { user } = prisma; return user; };'))).toBe(true);
  });
  it('does NOT flag a normal $queryRaw result binding', async () => {
    expect(flagsRebind(await repoSyntax('export const f = async () => { const rows = await prisma.$queryRaw`SELECT 1`; return rows; };'))).toBe(false);
  });
  it('is scoped to the data layer — same rebind in a service file is allowed', async () => {
    expect(flagsRebind(await repoSyntax('export const f = () => { const db = prisma; return db; };', 'service/orders/server/orders.service.ts'))).toBe(false);
  });
});

describe('permission check shape (N4 — object, not bare string/array)', () => {
  const flagsArg = (m: string[]) => m.some(x => x.includes('PermissionCheck object'));
  it('flags a bare string', async () => {
    expect(flagsArg(await syntaxErrors('app/lib/guard.ts', 'export const f = () => assertPermissions("cust.read");'))).toBe(true);
  });
  it('flags a bare array', async () => {
    expect(flagsArg(await syntaxErrors('app/lib/guard.ts', "export const f = () => requirePermissions(['a','b']);"))).toBe(true);
  });
  it('does NOT flag the { all } object form', async () => {
    expect(flagsArg(await syntaxErrors('app/lib/guard.ts', "export const f = () => assertPermissions({ all: ['cust.read'] });"))).toBe(false);
  });
  it('does NOT flag an identifier (cannot verify, allowed)', async () => {
    expect(flagsArg(await syntaxErrors('app/lib/guard.ts', 'export const f = (check) => assertPermissions(check);'))).toBe(false);
  });
});

describe('NextIntlClientProvider needs messages (N5 — else raw keys)', () => {
  const flagsProvider = (m: string[]) => m.some(x => x.includes('NextIntlClientProvider'));
  it('flags a provider with only locale', async () => {
    expect(flagsProvider(await syntaxErrors('app/layout.tsx', 'export const X = ({locale, children}) => <NextIntlClientProvider locale={locale}>{children}</NextIntlClientProvider>;'))).toBe(true);
  });
  it('does NOT flag a provider that passes messages', async () => {
    expect(flagsProvider(await syntaxErrors('app/layout.tsx', 'export const X = ({locale, messages, children}) => <NextIntlClientProvider locale={locale} messages={messages}>{children}</NextIntlClientProvider>;'))).toBe(false);
  });
});

describe('NEXT_LOCALE literal ban (N6)', () => {
  const flagsCookie = (m: string[]) => m.some(x => x.includes('NEXT_LOCALE'));
  it('flags the hardcoded cookie name', async () => {
    expect(flagsCookie(await syntaxErrors('app/lib/locale.ts', 'export const c = "NEXT_LOCALE";'))).toBe(true);
  });
  it('does NOT flag the team cookie value "locale"', async () => {
    expect(flagsCookie(await syntaxErrors('app/lib/locale.ts', 'export const c = "locale";'))).toBe(false);
  });
});

describe('kv.set explicit TTL (N7 — no silent forever-keys)', () => {
  const flagsTtl = (m: string[]) => m.some(x => x.includes('explicit TTL'));
  it('flags kv.set with no TTL arg', async () => {
    expect(flagsTtl(await syntaxErrors('app/lib/cache.ts', 'export const f = (v) => kv.set("k", v);'))).toBe(true);
  });
  it('does NOT flag kv.set with a positive TTL', async () => {
    expect(flagsTtl(await syntaxErrors('app/lib/cache.ts', 'export const f = (v) => kv.set("k", v, 60);'))).toBe(false);
  });
  it('does NOT flag kv.set with explicit undefined (intentionally permanent)', async () => {
    expect(flagsTtl(await syntaxErrors('app/lib/cache.ts', 'export const f = (v) => kv.set("k", v, undefined);'))).toBe(false);
  });
});

describe('mail:queue lpush ban (N8)', () => {
  const flagsLpush = (m: string[]) => m.some(x => x.includes('lpush the mail:queue'));
  it('flags a direct lpush of the mail queue', async () => {
    expect(flagsLpush(await syntaxErrors('app/lib/enqueue.ts', 'export const f = (redis, job) => redis.lpush("mail:queue", job);'))).toBe(true);
  });
  it('does NOT flag lpush of an unrelated queue', async () => {
    expect(flagsLpush(await syntaxErrors('app/lib/enqueue.ts', 'export const f = (redis, job) => redis.lpush("jobs:queue", job);'))).toBe(false);
  });
});

// ---- v12 follow-ups: reference rules that were precise after all ----------

async function importErrorsIn(file: string, code: string): Promise<string[]> {
  const d = consumerRepo();
  const eslint = new ESLint({ cwd: d, overrideConfigFile: join(d, 'eslint.config.mjs') });
  const [res] = await eslint.lintText(code, { filePath: join(d, file) });
  return (res?.messages ?? []).filter(m => m.ruleId === 'no-restricted-imports').map(m => m.message);
}

describe('next-intl/middleware import ban (N9 — no locale-routing middleware)', () => {
  it('flags next-intl/middleware (tested in a route handler — region A carries the patterns)', async () => {
    const msgs = await importErrorsIn('app/api/x/route.ts', `import createMiddleware from 'next-intl/middleware';\nexport function GET() { return new Response(); }`);
    expect(msgs.some(m => m.includes('@cloud/i18n'))).toBe(true);
  });
});

describe('no auth in the data layer (N10)', () => {
  async function repoSyntax(code: string, file = 'service/orders/server/orders.repository.ts'): Promise<string[]> {
    const d = consumerRepo();
    const eslint = new ESLint({ cwd: d, overrideConfigFile: join(d, 'eslint.config.mjs') });
    const [res] = await eslint.lintText(code, { filePath: join(d, file) });
    return (res?.messages ?? []).filter(m => m.ruleId === 'no-restricted-syntax').map(m => m.message);
  }
  const flagsAuth = (m: string[]) => m.some(x => x.includes('data layer stays dumb'));
  it('flags assertPermissions in a repository', async () => {
    expect(flagsAuth(await repoSyntax('export const f = () => assertPermissions({ all: ["x"] });'))).toBe(true);
  });
  it('flags getSession in a repository', async () => {
    expect(flagsAuth(await repoSyntax('export const f = async () => { const s = await getSession(); return s; };'))).toBe(true);
  });
  it('does NOT flag the same call in a service file', async () => {
    expect(flagsAuth(await repoSyntax('export const f = () => assertPermissions({ all: ["x"] });', 'service/orders/server/orders.service.ts'))).toBe(false);
  });
});

describe('@cloud/cache banned in middleware (N11 — Edge runtime)', () => {
  it('flags @cloud/cache imported in middleware', async () => {
    const msgs = await importErrorsIn('middleware.ts', `import { kv } from '@cloud/cache';\nexport function middleware() { return kv; }`);
    expect(msgs.some(m => m.includes('Edge runtime'))).toBe(true);
  });
  it('does NOT flag @cloud/cache in a route handler (allowed on Node)', async () => {
    const msgs = await importErrorsIn('app/api/x/route.ts', `import { kv } from '@cloud/cache';\nexport function GET() { return new Response(); }`);
    expect(msgs.some(m => m.includes('Edge runtime'))).toBe(false);
  });
});
