import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync, unlinkSync, readdirSync, renameSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setPackageScript, addDevDependency, appendGitignore } from '../patch-json.ts';
import type { SetupSummary } from '../types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
// commands -> src -> setup -> tools -> <repo root>
const CTX = join(HERE, '../../../../context');
const E2E_TPL = join(CTX, 'e2e');
const ORPHAN_SRC = join(CTX, 'check-e2e-orphans.mjs');
const REPORT_SRC = join(CTX, 'check-e2e-report.mjs');

const SENTINEL_RE = /\/\/ next-kit:e2e-bootstrap v(\d+)/;
// docker-compose.e2e.yml carries a YAML (`#`) comment sentinel, not the `//` one.
const COMPOSE_SENTINEL_RE = /# next-kit:e2e-bootstrap v\d+/;
export const E2E_VERSION = 14;

// Pinned alongside E2E_VERSION — the templates import these; nothing else installs them.
// `pg` (+ its types) powers the truncate-between fixture (`e2e/fixtures/db.ts`) with a
// raw client: Playwright's transform can't load the Prisma 7 ESM client, so the fixture
// can't go through `@cloud/db`.
const E2E_DEV_DEPS: ReadonlyArray<[name: string, range: string]> = [
  ['@playwright/test', '^1.49.0'],
  ['dotenv', '^16.4.5'],
  ['pg', '^8.13.0'],
  ['@types/pg', '^8.11.10'],
];

const GITIGNORE_ENTRIES = ['.e2e/', 'e2e/.auth/', 'playwright-report/', '.env.test'];

// .env.test keys the tool manages. User keys are fill-missing (preserve a user value);
// DATABASE_URL/REDIS_URL are derived from the host-port keys; ENV_PRUNE are removed.
const ENV_USER_DEFAULTS: ReadonlyArray<readonly [key: string, value: string]> = [
  ['E2E_CONSOLE', 'admin'],
  ['E2E_BASE_URL', 'http://localhost:3000'],
  ['E2E_PORTAL_URL', 'http://localhost:3100'],
  ['E2E_ADMIN_EMAIL', 'admin@newlandnpt.com'],
  ['E2E_ADMIN_PASSWORD', 'ChangeMe!123'],
  ['E2E_PG_HOST_PORT', '5434'],
  ['E2E_REDIS_HOST_PORT', '6380'],
];
const ENV_PRUNE = ['E2E_CAPTCHA_BYPASS_TOKEN', 'NEXT_PUBLIC_AUTH_LOGIN_RSA_PUBLIC_KEY', 'E2E_USER_EMAIL', 'E2E_USER_PASSWORD'];

function parseEnv(text: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    const i = t.indexOf('=');
    if (!t || t.startsWith('#') || i <= 0) continue;
    m.set(t.slice(0, i).trim(), t.slice(i + 1).trim());
  }
  return m;
}

// Fill-missing user keys; value-gated E2E_BASE_URL migration (stale portal origin → console);
// ALWAYS derive DATABASE_URL/REDIS_URL from the host-port keys; prune dropped keys; preserve
// comments + unknown lines.
export function writeEnvTest(rootDir: string, dryRun: boolean): { status: 'patched' | 'noop'; detail: string } {
  const file = join(rootDir, '.env.test');
  const raw = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const cur = parseEnv(raw);

  const fin = new Map<string, string>();
  for (const [k, def] of ENV_USER_DEFAULTS) fin.set(k, cur.get(k) ?? def); // fill-missing
  const portal = fin.get('E2E_PORTAL_URL')!;
  if (cur.get('E2E_BASE_URL') === portal) fin.set('E2E_BASE_URL', 'http://localhost:3000'); // migrate-by-value
  fin.set('DATABASE_URL', `postgresql://e2e:e2e@localhost:${fin.get('E2E_PG_HOST_PORT')}/e2e`); // derived
  fin.set('REDIS_URL', `redis://localhost:${fin.get('E2E_REDIS_HOST_PORT')}`);

  const emitted = new Set<string>();
  const out: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    const i = t.indexOf('=');
    const key = !t || t.startsWith('#') || i <= 0 ? null : t.slice(0, i).trim();
    if (key && ENV_PRUNE.includes(key)) continue;            // drop pruned
    if (key && fin.has(key)) { out.push(`${key}=${fin.get(key)}`); emitted.add(key); continue; } // rewrite managed
    out.push(line);                                          // preserve comments/unknown
  }
  for (const [k, v] of fin) if (!emitted.has(k)) out.push(`${k}=${v}`); // append missing
  let body = out.join('\n').replace(/\n{2,}$/, '\n');
  if (!body.endsWith('\n')) body += '\n';
  if (raw === body) return { status: 'noop', detail: '.env.test already current' };
  if (!dryRun) writeFileSync(file, body);
  return { status: 'patched', detail: raw ? 'updated .env.test (fill-missing + derived + prune)' : 'wrote .env.test' };
}

const VITEST_CONFIG_NAMES = ['vitest.config.ts', 'vitest.config.mts', 'vitest.config.js', 'vitest.config.mjs'];
const VITEST_EXCLUDE_FIX =
  "add 'e2e/**' to test.exclude. If exclude already lists entries, append 'e2e/**' to that array " +
  "(keep the existing ones). If there is no exclude, vitest uses its defaults — set " +
  "`exclude: [...configDefaults.exclude, 'e2e/**']` (`import { configDefaults } from 'vitest/config'`) so " +
  'you do not drop them. A bare `exclude: [...]` REPLACES the defaults.';

export interface SetupE2eOptions {
  rootDir: string;
  dryRun: boolean;
  verify?: boolean;
}

// Kit-owned: overwritten every run (src relative to context/e2e, dest relative to repo root).
const KIT_OWNED: ReadonlyArray<readonly [src: string, dest: string]> = [
  ['e2e.nextkit.ts', 'e2e.nextkit.ts'],
  ['playwright.config.ts', 'playwright.config.ts'],
  ['e2e/global-setup.ts', 'e2e/global-setup.ts'],
  ['e2e/fixtures/db.ts', 'e2e/fixtures/db.ts'],
  ['e2e/_smoke.spec.ts', 'e2e/_smoke.spec.ts'],
  ['flows/_login.ts', 'e2e/flows/_login.ts'],
  ['flows/playwright.config.ts', 'e2e/flows/playwright.config.ts'],
];
const WRITE_IF_ABSENT: ReadonlyArray<readonly [src: string, dest: string]> = [
  ['e2e/keep.local.ts', 'e2e/keep.local.ts'],
];

// Apply schema THEN seed against the E2E database. Use the kit's root prisma
// wrapper (`scripts/prisma.mjs` — it locates the schema under packages/db,
// which bare `prisma` can't) but run it under `node --env-file=.env.test`, so
// `DATABASE_URL` resolves to the e2e Postgres from `.env.test`. Plain
// `pnpm db:*` loads root `.env` and would push/seed the *dev* DB, leaving the
// e2e DB empty → global-setup then has no admin to log in as. (`.env.test` is
// required by the e2e contract anyway; `--env-file` errors if it's missing,
// which is the right signal.) Baseline is `db push`; versioned migrations are
// the documented exception.
function detectSchemaApply(rootDir: string): string {
  const hasMigrations =
    existsSync(join(rootDir, 'prisma', 'migrations')) ||
    existsSync(join(rootDir, 'packages', 'db', 'prisma', 'migrations'));
  const prisma = 'node --env-file=.env.test scripts/prisma.mjs';
  const apply = hasMigrations ? `${prisma} migrate deploy` : `${prisma} db push`;
  // Run the app seed: it creates the admin baseline (admin@newlandnpt.com) UNCONDITIONALLY —
  // that one account is all the basic e2e env needs. E2E_SEED=1 is a harmless forward-compat
  // prefix: if an author later gates extra e2e-only accounts behind it in the app seed, they
  // get created too; the basic-env admin needs no gate. (`--env-file=.env.test` is load-bearing:
  // plain `pnpm db:*` loads root `.env` = the DEV db, missing the e2e Postgres.)
  return `${apply} && E2E_SEED=1 ${prisma} db seed`;
}

// Vitest's `exclude` REPLACES its defaults, so we can't safely regex-insert
// `e2e/**` without dropping the consumer's other exclusions — and the config
// is a TS module. Detect + report a `manual` edit instead (matches how the
// tool already defers drifted/hand-rolled configs).
function detectVitestExclude(rootDir: string): SetupSummary['patches'][number] | null {
  const file = VITEST_CONFIG_NAMES.find(n => existsSync(join(rootDir, n)));
  if (!file) return null;
  const src = readFileSync(join(rootDir, file), 'utf8');
  if (/\be2e\b/.test(src)) return { file, status: 'noop', detail: 'e2e already excluded' };
  return { file, status: 'manual', detail: VITEST_EXCLUDE_FIX };
}

function installDevDeps(rootDir: string): SetupSummary['patches'] {
  return E2E_DEV_DEPS.map(([name, range]) => {
    const r = addDevDependency(rootDir, name, range);
    return { file: 'package.json', status: r.kind, detail: r.kind === 'patched' ? r.detail : `${name} ${r.reason}` };
  });
}

function detectMarkerRootsPrefix(rootDir: string): string {
  if (existsSync(join(rootDir, 'apps'))) {
    return "E2E_MARKER_ROOTS='apps/*/src apps/*/app apps/*/middleware.ts' ";
  }
  return '';
}

// `test:e2e:spec` must END with `playwright test` — a spec path appended by
// pnpm reaches it; `check:e2e-orphans` must carry the marker-roots prefix —
// bare, it greps zero markers in a monorepo and exits 0 (silent false-green).
// `test:e2e` composes both.
function buildSpecScript(rootDir: string): string {
  const schemaApply = detectSchemaApply(rootDir);
  return [
    // `.env.test` is gitignored — absent after a clone. Guard it before
    // `--env-file` aborts cryptically, so a missing file fails with the fix
    // (not a stack trace) and can't be mistaken for unrunnable infra.
    `[ -f .env.test ] || { echo "e2e: .env.test missing — run \`.claude/bin/setup e2e\` to write it (or copy .env.test.example), then re-run"; exit 1; }`,
    // `--wait` (no service name) brings up every service the compose defines —
    // Postgres AND Redis on a fresh install, and stays correct if an upgrade's
    // preserved compose still has only Postgres until the consumer adds Redis.
    'docker compose --env-file .env.test -f e2e/docker-compose.e2e.yml up -d --wait',
    schemaApply,
    'playwright test',
  ].join(' && ');
}

function resetE2eScripts(rootDir: string): SetupSummary['patches'] {
  const scripts: ReadonlyArray<readonly [name: string, command: string]> = [
    ['test:e2e:spec', buildSpecScript(rootDir)],
    ['check:e2e-orphans', `${detectMarkerRootsPrefix(rootDir)}node scripts/check-e2e-orphans.mjs`],
    ['check:e2e-report', 'node scripts/check-e2e-report.mjs'],
    ['test:e2e', 'pnpm test:e2e:spec && pnpm check:e2e-report && pnpm check:e2e-orphans'],
  ];
  return scripts.map(([name, desired]) => {
    const r = setPackageScript(rootDir, name, desired);
    return { file: 'package.json', status: r.kind === 'patched' ? 'patched' as const : 'noop' as const,
             detail: r.kind === 'patched' ? r.detail : `${name} already current` };
  });
}

// Write only when the destination is missing or its bytes differ — a direct compare (no
// hash needed: both files are local + tiny, and Buffer.equals early-exits on the first
// differing byte). Converges + self-heals drift, but a re-run at the current version does
// zero writes. Returns true iff it wrote.
function copyIfChanged(src: string, dest: string): boolean {
  const next = readFileSync(src);
  if (existsSync(dest) && readFileSync(dest).equals(next)) return false;
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, next);
  return true;
}

// docker-compose.e2e.yml lives under e2e/. Write only when changed (copyIfChanged).
// Relocate a stale root copy (delete it) before writing. Returns true iff it wrote.
function placeComposeFile(rootDir: string): boolean {
  const dest = join(rootDir, 'e2e', 'docker-compose.e2e.yml');
  mkdirSync(join(rootDir, 'e2e'), { recursive: true });
  const rootPath = join(rootDir, 'docker-compose.e2e.yml');
  if (existsSync(rootPath)) unlinkSync(rootPath);
  return copyIfChanged(join(E2E_TPL, 'docker-compose.e2e.yml'), dest);
}

// v12 layout: per-feature specs live under e2e/feature/, not flat in e2e/. Relocate a
// consumer's existing top-level *.spec.ts into e2e/feature/ — a plain move (consumer-owned,
// never templated). _smoke.spec.ts is the kit canary and stays at top-level. Idempotent:
// once specs are under e2e/feature/, the top-level scan finds nothing. A name already present
// under e2e/feature/ is a CONFLICT — never clobber the canonical copy; leave both and report
// it for the human to reconcile. Returns moved dests + the basenames that conflicted.
function relocateFeatureSpecs(rootDir: string): { moved: string[]; conflicts: string[] } {
  const flat = join(rootDir, 'e2e');
  if (!existsSync(flat)) return { moved: [], conflicts: [] };
  const moved: string[] = [];
  const conflicts: string[] = [];
  for (const n of readdirSync(flat)) {
    if (!n.endsWith('.spec.ts') || n === '_smoke.spec.ts') continue;
    const dest = join(flat, 'feature', n);
    if (existsSync(dest)) { conflicts.push(n); continue; } // don't overwrite the canonical copy
    mkdirSync(dirname(dest), { recursive: true });
    renameSync(join(flat, n), dest);
    moved.push(`e2e/feature/${n}`);
  }
  return { moved, conflicts };
}

function runStep(cmd: string, args: string[], cwd: string): void {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`--verify: \`${cmd} ${args.join(' ')}\` exited ${r.status ?? r.signal}`);
}

// Explicit operator opt-in (never auto-runs). Checks preconditions with pointed errors, then
// runs the canary via the consumer's own script. Wire, don't run: only --verify triggers this.
async function runVerify(rootDir: string): Promise<string> {
  const rootEnv = join(rootDir, '.env');
  const need = ['AUTH_LOGIN_RSA_PRIVATE_KEY', 'AUTH_SESSION_SECRET', 'AUTH_AES_SECRET_KEY'];
  const text = existsSync(rootEnv) ? readFileSync(rootEnv, 'utf8') : '';
  const missing = existsSync(rootEnv) ? need.filter(k => !new RegExp(`^\\s*${k}=`, 'm').test(text)) : need;
  if (missing.length) {
    throw new Error(`--verify: root .env ${existsSync(rootEnv) ? `missing ${missing.join(', ')}` : 'file absent'} — login needs these. Add them, then re-run.`);
  }
  runStep('pnpm', ['exec', 'playwright', 'install', 'chromium'], rootDir);
  runStep('pnpm', ['test:e2e:spec', 'e2e/_smoke.spec.ts'], rootDir);
  return 'Verified: e2e/_smoke.spec.ts passed (env healthy).';
}

export async function setupE2e(opts: SetupE2eOptions): Promise<SetupSummary> {
  const { rootDir, dryRun, verify = false } = opts;
  const pwPath = join(rootDir, 'playwright.config.ts');

  const m = existsSync(pwPath) ? readFileSync(pwPath, 'utf8').match(SENTINEL_RE) : null;
  const installed = m ? Number(m[1]) : null;
  if (installed !== null && installed > E2E_VERSION) {
    return {
      filesWritten: [],
      patches: [{ file: 'playwright.config.ts', status: 'manual', detail: `found v${installed} (newer than v${E2E_VERSION}); do not downgrade` }],
      verifyHint: 'Consumer is on a newer kit — ask before changing anything.',
    };
  }
  const mode = installed === null ? 'Installed' : installed < E2E_VERSION ? `Upgraded → v${E2E_VERSION}` : `Re-asserted v${E2E_VERSION}`;

  const filesWritten: string[] = [];
  const patches: SetupSummary['patches'] = [];

  if (!dryRun) {
    for (const [src, dest] of KIT_OWNED) {
      if (copyIfChanged(join(E2E_TPL, src), join(rootDir, dest))) filesWritten.push(dest);
    }
    if (copyIfChanged(ORPHAN_SRC, join(rootDir, 'scripts', 'check-e2e-orphans.mjs'))) filesWritten.push('scripts/check-e2e-orphans.mjs');
    if (copyIfChanged(REPORT_SRC, join(rootDir, 'scripts', 'check-e2e-report.mjs'))) filesWritten.push('scripts/check-e2e-report.mjs');
    if (placeComposeFile(rootDir)) filesWritten.push('e2e/docker-compose.e2e.yml');
    const reloc = relocateFeatureSpecs(rootDir);
    filesWritten.push(...reloc.moved);
    for (const n of reloc.conflicts)
      patches.push({ file: `e2e/${n}`, status: 'manual', detail: `both e2e/${n} and e2e/feature/${n} exist — kept both, moved neither; delete the stale one by hand` });
    for (const [src, dest] of WRITE_IF_ABSENT) {
      const d = join(rootDir, dest);
      if (!existsSync(d)) { mkdirSync(dirname(d), { recursive: true }); copyFileSync(join(E2E_TPL, src), d); filesWritten.push(dest); }
    }
    if (copyIfChanged(join(E2E_TPL, '.env.test.example'), join(rootDir, '.env.test.example'))) filesWritten.push('.env.test.example');

    patches.push({ file: '.env.test', ...writeEnvTest(rootDir, dryRun) });
    patches.push(...resetE2eScripts(rootDir));
    patches.push(...installDevDeps(rootDir));
    const gi = appendGitignore(rootDir, GITIGNORE_ENTRIES);
    patches.push({ file: '.gitignore', status: gi.kind === 'patched' ? 'patched' : 'noop', detail: gi.kind === 'patched' ? gi.detail : 'entries present' });
    const vitest = detectVitestExclude(rootDir);
    if (vitest) patches.push(vitest);
  }

  let verifyNote = 'Run `.claude/bin/setup e2e --verify` to prove the env (brings up the stack + runs e2e/_smoke.spec.ts). Setup never auto-runs the suite.';
  if (verify && !dryRun) verifyNote = await runVerify(rootDir);

  return {
    filesWritten,
    patches,
    verifyHint: `${dryRun ? `Would (re)assert v${E2E_VERSION}` : mode} — kit-owned files overwritten; .env.test filled (fill-missing + derived); creds = the seeded admin (admin@newlandnpt.com). ${verifyNote}`,
  };
}
