// next-kit:e2e-bootstrap v14
//
// Team e2e harness — the single versioned contract module. Copied verbatim to the consumer
// root by `.claude/bin/setup e2e` and OVERWRITTEN on every run (do NOT edit; tune via .env.test +
// e2e/keep.local.ts). Pulls only pg + @playwright/test + dotenv so it loads under
// Playwright's transform — never import @cloud/db / @prisma/client here (they don't load
// under that transform). Raw SQL duplicates schema column names — keep the set minimal.
import { chromium, type PlaywrightTestConfig } from '@playwright/test';
import { Pool } from 'pg';
import { mkdir } from 'node:fs/promises';
import { KEEP_LOCAL } from './e2e/keep.local.ts';

// One pool, shared by every spec in the worker (workers:1). allowExitOnIdle unrefs idle
// clients so the worker exits at end-of-run with no explicit pool.end(). NEVER call
// pool.end() from a spec — ending this shared pool poisons every spec that runs after.
export const pool = new Pool({ connectionString: process.env.DATABASE_URL, allowExitOnIdle: true });

// Identity/RBAC + party-scope tables a seeded session reads on RE-LOGIN. Kept so the first
// truncateAll() doesn't wipe the accounts that stored sessions (and createLoginUser users)
// log in as. sys_role is omitted: the seeded admin uses a code role (roleId<=300, resolved
// in-memory, never a sys_role row). A consumer seeding a DB role (>=1001) adds 'sys_role'
// via e2e/keep.local.ts.
export const DEFAULT_KEEP = ['sys_party', 'sys_party_user', 'sys_user', 'sys_party_contract'] as const;

// Call between tests. RESTART IDENTITY CASCADE so serial PKs reset and FKs don't block.
export async function truncateAll(opts: { keep?: readonly string[] } = {}): Promise<void> {
  const keep = new Set<string>(['_prisma_migrations', ...DEFAULT_KEEP, ...KEEP_LOCAL, ...(opts.keep ?? [])]);
  const { rows } = await pool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  const list = rows.filter(r => !keep.has(r.tablename)).map(r => `"public"."${r.tablename}"`).join(', ');
  if (!list) return;
  await pool.query(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

// Known argon2id hash of DEFAULT_PASSWORD — reused from the app seed so a created user's
// password verifies at login. Precomputed, NOT hashed at runtime: argon2 is a native
// server-only module that won't load under Playwright's transform.
export const DEFAULT_PASSWORD = 'ChangeMe!123';
export const DEFAULT_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$Ev3lJmDRsEa0Nbomhgn47A$1lT4/JCDbV5hT5+63bxLMZBMyUinbkuEiAko+NTT96g';

export interface CreateLoginUserInput {
  email: string;
  nickName?: string;
  passwordHash?: string;        // precomputed; default = hash of DEFAULT_PASSWORD
  authorizedContractType?: string; // the contract TYPE; 'ADMIN' = the ADMIN console group
  country?: string;
  timezone?: string;
  roles?: Array<{ roleId: number }>;
}

// Create/refresh a single-party, login-capable user that hands off to the console:
// exactly one ACTIVE party + ACTIVE user + a valid ACTIVE contract ⇒ login resolves one
// selectable party ⇒ no /select-partner. Idempotent via ON CONFLICT on the unique keys
// (email is citext-unique, party_name unique, (party_id,user_id) is uk_sys_party_user).
// sys_party.status MUST be 'ACTIVE' — the schema default 'ONBOARDING' is filtered out.
// Returns the ids. roles=[] ⇒ login-capable but zero-permission (reaches the console;
// pass roleIds for permission-gated assertions).
export async function createLoginUser(input: CreateLoginUserInput): Promise<{ userId: number; partyId: number }> {
  const {
    email,
    nickName = email,
    passwordHash = DEFAULT_PASSWORD_HASH,
    authorizedContractType = 'ADMIN',
    country = 'US',
    timezone = 'America/New_York',
    roles = [],
  } = input;
  const partyName = `e2e:${email}`;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const party = await client.query<{ party_id: number }>(
      `INSERT INTO sys_party (party_name, country, timezone, status)
       VALUES ($1, $2, $3, 'ACTIVE')
       ON CONFLICT (party_name) DO UPDATE
         SET status = 'ACTIVE', country = EXCLUDED.country, timezone = EXCLUDED.timezone
       RETURNING party_id`,
      [partyName, country, timezone],
    );
    const partyId = party.rows[0].party_id;
    const user = await client.query<{ user_id: number }>(
      `INSERT INTO sys_user (email, nick_name, password_hash, status, mfa_enable)
       VALUES ($1, $2, $3, 'ACTIVE', false)
       ON CONFLICT (email) DO UPDATE
         SET nick_name = EXCLUDED.nick_name, password_hash = EXCLUDED.password_hash,
             status = 'ACTIVE', mfa_enable = false
       RETURNING user_id`,
      [email, nickName, passwordHash],
    );
    const userId = user.rows[0].user_id;
    // sys_party_contract has no unique key on (party, type) → delete-then-insert for idempotency.
    await client.query(
      `DELETE FROM sys_party_contract WHERE authorized_party_id = $1 AND authorized_contract_type = $2`,
      [partyId, authorizedContractType],
    );
    await client.query(
      `INSERT INTO sys_party_contract (authorized_party_id, authorized_contract_type, status, authorized_timestamp)
       VALUES ($1, $2, 'ACTIVE', now())`,
      [partyId, authorizedContractType],
    );
    await client.query(
      `INSERT INTO sys_party_user (party_id, user_id, roles, authorizing_type, status)
       VALUES ($1, $2, $3::jsonb, 'ADMIN', 'ACTIVE')
       ON CONFLICT (party_id, user_id) DO UPDATE SET roles = EXCLUDED.roles, status = 'ACTIVE'`,
      [partyId, userId, JSON.stringify(roles)],
    );
    await client.query('COMMIT');
    return { userId, partyId };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export interface SignInInput {
  role: string;       // names the storageState file: e2e/.auth/<role>.json
  portalUrl: string;  // E2E_PORTAL_URL
  baseURL: string;    // E2E_BASE_URL (the console)
  email: string;
  password?: string;  // default DEFAULT_PASSWORD
}

// Drive the real portal login UI, follow the cross-host handoff to the console, persist the
// session. No crypto in the harness — the app does RSA client-side. There is NO <form>
// wrapper, so submit is wired to the password field's onKeyDown Enter (fires regardless of
// the disabled CTA); pressing Enter is the locale-independent submit. `submitPassword`
// re-validates (valid email + pw>=6), so a valid email + >=6-char password must be filled.
export async function signInForE2E({ role, portalUrl, baseURL, email, password = DEFAULT_PASSWORD }: SignInInput): Promise<void> {
  await mkdir('e2e/.auth', { recursive: true });
  const consoleOrigin = new URL(baseURL).origin;
  const consoleHost = new URL(baseURL).hostname;
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try {
    await page.goto(`${portalUrl}/login`);
    await page.fill('#login-email', email);
    await page.fill('#login-password', password);
    await page.locator('#login-password').press('Enter');
    // Handoff complete when the browser lands on the console origin.
    await page.waitForURL(u => u.origin === consoleOrigin, { timeout: 30_000 });
    // Guard: a real CONSOLE session cookie ('sid', host-only on the console origin) must
    // exist — portal-only cookies would false-pass a failed handoff. Refuse to persist anon.
    const state = await ctx.storageState();
    const authed = state.cookies.some(c => c.name === 'sid' && c.domain.replace(/^\./, '') === consoleHost);
    if (!authed) {
      throw new Error(
        `signInForE2E(${role}): no 'sid' cookie on ${consoleOrigin} after handoff — login didn't ` +
          `take (selectors/creds/handoff). Refusing to save anonymous storageState.`,
      );
    }
    await ctx.storageState({ path: `e2e/.auth/${role}.json` });
  } finally {
    await browser.close();
  }
}

const REQUIRED = ['E2E_BASE_URL', 'E2E_PORTAL_URL', 'E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD', 'DATABASE_URL', 'REDIS_URL'] as const;

// Build the globalSetup default export. Basic env uses roles: ['admin']; an author adds a
// role only after providing its account (createLoginUser + an E2E_<ROLE>_EMAIL/PASSWORD).
export function makeGlobalSetup({ roles }: { roles: string[] }) {
  return async function globalSetup(): Promise<void> {
    const missing = REQUIRED.filter(k => !process.env[k]);
    if (missing.length) throw new Error(`global-setup: missing env: ${missing.join(', ')}. See .env.test.example.`);
    const portalUrl = process.env.E2E_PORTAL_URL!;
    const baseURL = process.env.E2E_BASE_URL!;
    for (const role of roles) {
      const u = role.toUpperCase();
      await signInForE2E({
        role,
        portalUrl,
        baseURL,
        email: process.env[`E2E_${u}_EMAIL`]!,
        password: process.env[`E2E_${u}_PASSWORD`]!,
      });
    }
  };
}

const PROXY_VARS = ['http_proxy', 'https_proxy', 'HTTP_PROXY', 'HTTPS_PROXY', 'all_proxy', 'ALL_PROXY'];
// Console → readiness URL. Consoles without /api/health fall back to the login redirect (200).
const HEALTH_PATH: Record<string, string> = { admin: '/api/health' };

// Build the Playwright config. `console` = the app under test (default 'admin'); portal is
// always the login host. Pins the console group's app-URL to localhost so the portal handoff
// redirects locally (root .env points these at *.github.dev). appUrlForGroup reads these at
// runtime (server-only), so the webServer env override takes effect.
export function defineE2eConfig({ console: consoleApp = 'admin' }: { console?: string } = {}): PlaywrightTestConfig {
  for (const k of PROXY_VARS) delete process.env[k];
  process.env.NO_PROXY = 'localhost,127.0.0.1';
  process.env.no_proxy = 'localhost,127.0.0.1';

  const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
  const portalUrl = process.env.E2E_PORTAL_URL ?? 'http://localhost:3100';
  const consoleReady = HEALTH_PATH[consoleApp] ? `${baseURL}${HEALTH_PATH[consoleApp]}` : baseURL;
  // Our pins must WIN over root .env, so spread process.env first then override.
  // Pins the ADMIN console group + portal to localhost. A non-admin console (E2E_CONSOLE !==
  // 'admin') would also need ITS group URL (e.g. CUSTOMER_APP_URL) pinned here for the handoff.
  const env = { ...process.env, ADMIN_APP_URL: baseURL, PORTAL_APP_URL: portalUrl } as Record<string, string>;

  const portalServer = { command: 'pnpm -F portal dev', url: portalUrl, reuseExistingServer: !process.env.CI, timeout: 180_000, env };
  const consoleServer = { command: `pnpm -F ${consoleApp} dev`, url: consoleReady, reuseExistingServer: !process.env.CI, timeout: 180_000, env };

  return {
    testDir: 'e2e',
    testIgnore: ['**/flows/**'], // the deploy-then-test journey suite runs via its own config, not here
    workers: 1, // truncate-between is not parallel-safe
    globalSetup: './e2e/global-setup.ts',
    reporter: [['html', { open: 'never' }], ['json', { outputFile: '.e2e/raw.json' }]],
    webServer: consoleApp === 'portal' ? [portalServer] : [consoleServer, portalServer],
    use: { baseURL },
    projects: [
      { name: 'anon', use: {} },
      { name: 'admin', use: { storageState: 'e2e/.auth/admin.json' } },
    ],
  };
}
