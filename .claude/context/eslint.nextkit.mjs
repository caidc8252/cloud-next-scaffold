// next-kit ESLint guardrail preset — single source of truth for the
// shared-package lint rules. Copied into consumer repos by `tools/setup`
// (`bin/setup eslint`) and imported from the consumer's eslint.config.*.
//
// CRITICAL: ESLint flat config does NOT merge `no-restricted-*` options
// across matching config objects — the LAST matching block wins and fully
// replaces the setting. Therefore every region below is mutually exclusive
// (each file matches exactly one `no-restricted-syntax` block and one
// `no-restricted-imports` block) and carries its region's COMPLETE set.
//
// See skills/setup/references/eslint.md and
// docs/superpowers/specs/2026-05-27-setup-clean-architecture-design.md.

import { createRequire } from 'node:module';
const requireFrom = createRequire(import.meta.url);

// ---- no-restricted-imports entries ---------------------------------------
const NEXT_AUTH = { name: 'next-auth', message: 'Use @cloud/permissions/server: requireSession, getSession, assertPermissions.' };
const STYLED = { name: 'styled-components', message: 'No CSS-in-JS. Use Tailwind utilities over @cloud/ui tokens.' };
const BCRYPT_GROUP = [
  { name: 'bcryptjs', message: 'Use @cloud/security/server: hashPassword, verifyPassword.' },
  { name: 'bcrypt', message: 'Use @cloud/security/server: hashPassword, verifyPassword.' },
  { name: '@node-rs/bcrypt', message: 'Use @cloud/security/server: hashPassword, verifyPassword.' },
  { name: 'argon2', message: 'Use @cloud/security/server: hashPassword, verifyPassword.' },
  { name: 'argon2-browser', message: 'Password hashing must run server-side. Use @cloud/security/server.' },
];
const CACHE_GROUP = [
  { name: 'ioredis', message: 'Use @cloud/cache: kv.get/set/del/expire. JSON serialization is automatic. For raw client access (pipelines, pub/sub), use getRedis() from @cloud/cache.' },
  { name: 'redis', message: 'Use @cloud/cache: kv.get/set/del/expire.' },
  { name: '@redis/client', message: 'Use @cloud/cache: kv.get/set/del/expire.' },
];
const STORAGE_GROUP = [
  { name: '@aws-sdk/client-s3', message: 'Use @cloud/storage/server (upload sessions, server upload, signed download) or @cloud/storage/client (browser direct + multipart). Don\'t construct the S3 client in app code.' },
  { name: '@aws-sdk/client-sts', message: 'Use @cloud/storage — credential/STS handling lives in the package, not app code.' },
];
const PRISMA_IMPORT = { name: '@prisma/client', message: 'Import the client and any model/enum types from @cloud/db. Under Prisma 7 the client generates to packages/db/generated/prisma — @prisma/client no longer resolves the model types; re-export them from @cloud/db rather than deep-importing generated internals.' };
const CLOUD_DB = { name: '@cloud/db', message: 'Route handlers must not touch the DB directly — call a service (service/<domain>/server/*.service.ts).' };
const DATA_LAYER_PATTERN = { group: ['**/*.repository', '**/*.mapper'], message: 'Route handlers delegate to a service — call service/<domain>/server/*.service.ts instead. Repository/mapper (data + VO layers) are invoked by the service, not the route.' };

const NEXT_AUTH_PATTERN = { group: ['next-auth/*'], message: "Use @cloud/permissions/server or @cloud/permissions/client. The team's auth library is not next-auth." };
const NEXT_INTL_PATTERN = { group: ['next-intl', 'next-intl/client'], message: 'Use @cloud/i18n (or @cloud/i18n/client for Client Components, @cloud/i18n/server for request config and server actions). Server Components may import getTranslations / getMessages from next-intl/server directly until @cloud/i18n/server re-exports them. Locales are ["en","zh-CN","ja"].' };
const VALIDATORS_PATTERN = { group: ['yup', 'joi', 'valibot', 'superstruct'], message: 'Use Zod for all input validation.' };
const EMOTION_PATTERN = { group: ['@emotion/*'], message: 'No CSS-in-JS. Use Tailwind utilities over @cloud/ui tokens.' };

const ALL_PATHS = [NEXT_AUTH, ...BCRYPT_GROUP, ...CACHE_GROUP, ...STORAGE_GROUP, PRISMA_IMPORT, STYLED];
const ALL_PATTERNS = [NEXT_AUTH_PATTERN, NEXT_INTL_PATTERN, VALIDATORS_PATTERN, EMOTION_PATTERN];

const without = (arr, drop) => arr.filter(x => !drop.includes(x));
const imports = (paths, patterns) => ['error', { paths, patterns }];

// ---- no-restricted-syntax selectors --------------------------------------
const SEL_NEXT_RESPONSE_JSON = { selector: "CallExpression[callee.object.name='NextResponse'][callee.property.name='json']", message: 'Use @cloud/request response helpers (successResponse, badRequestResponse, etc). Raw NextResponse.json is only for non-envelope responses (streaming, redirects).' };
const SEL_RESPONSE_JSON = { selector: "CallExpression[callee.object.name='Response'][callee.property.name='json']", message: 'Use @cloud/request response helpers (successResponse, badRequestResponse, etc) in route handlers.' };
const SEL_PRISMA = { selector: "NewExpression[callee.name='PrismaClient']", message: "Import the shared client from @cloud/db. Don't instantiate PrismaClient directly." };
const SEL_USE_SERVER = { selector: "ExpressionStatement[directive='use server']", message: 'Server actions are banned. Use a route handler in app/api/* and call it from the client via @cloud/request/client. See context/team-context.md.' };
const SEL_ASCHILD = { selector: "JSXAttribute[name.name='asChild']", message: "@cloud/ui uses base-ui (not Radix). Replace `asChild` with `render={<Component />}`. base-ui spreads unknown props silently onto the DOM — `asChild` compiles without error but the handler won't fire. Confirm prop names against packages/ui/src/components/ui/<name>.tsx." };
const SEL_TABLE = { selector: "JSXOpeningElement[name.name=/^(TableHeader|TableBody|TableRow|TableHead|TableCell|TableFooter|TableCaption)$/]", message: '@cloud/ui Table uses a columns/rows API, not shadcn slot composition. Use `<Table<R> columns={...} rows={...} rowKey={...} />`. See packages/ui/src/components/ui/table.tsx for the typed config shape.' };
const SEL_NATIVE_TABLE = { selector: "JSXOpeningElement[name.name=/^(table|thead|tbody|tfoot|tr|td|th)$/]", message: 'Use @cloud/ui `<Table<R> columns={...} rows={...} rowKey={...} />` (typed columns/rows API), not a hand-rolled native <table>/<thead>/<tbody>/<tr>/<td>. Native tables miss sort/sticky/empty/density. See packages/ui/src/components/ui/table.tsx.' };
const SEL_NATIVE_PROGRESS = { selector: "JSXOpeningElement[name.name='progress']", message: 'Use @cloud/ui `<Progress value={0..100} tone={...} />`, not a native <progress> or a hand-rolled width-bar div. See packages/ui/src/components/ui/progress.tsx.' };
const SEL_ONOPENCHANGE = { selector: "JSXOpeningElement[name.name='Modal'] > JSXAttribute[name.name='onOpenChange']", message: '`Modal` renames the dialog callback to `onClose` — the wrapper maps it internally, so `onOpenChange` is silently dropped. base-ui primitives that forward the native callback (CommandDialog, Sheet, Drawer, Popover, DropdownMenu, HoverCard, Tooltip, …) correctly keep `onOpenChange`. See packages/ui/src/components/ui/modal.tsx.' };
const SEL_ARBITRARY_LITERAL = { selector: "JSXAttribute[name.name='className'] Literal[value=/(?:^|\\s)(?:[a-z-]+:)*[a-z-]+-\\[/]", message: "No arbitrary Tailwind values. Snap to the nearest design-token scale class or use the primitive's size prop; compose tokens via a named @utility. See the ui skill." };
const SEL_ARBITRARY_TEMPLATE = { selector: "JSXAttribute[name.name='className'] TemplateElement[value.cooked=/(?:^|\\s)(?:[a-z-]+:)*[a-z-]+-\\[/]", message: "No arbitrary Tailwind values. Snap to the nearest design-token scale class or use the primitive's size prop; compose tokens via a named @utility. See the ui skill." };
const SEL_CURSOR = { selector: "JSXOpeningElement[name.name=/^[a-z]/]:has(JSXAttribute[name.name='onClick']):not(:has(JSXAttribute[name.name='className'] Literal[value=/(?:^|\\s)cursor-(?:pointer|not-allowed)(?:\\s|$)/]))", message: 'Clickable native elements (onClick) need a static cursor-pointer (or cursor-not-allowed) in className. For interactive UI, use a @cloud/ui primitive — it owns its cursor.' };
const SEL_INLINE_STYLE = { selector: "JSXAttribute[name.name='style'] Property[value.type='Literal']:not([key.value=/^--/])", message: 'No inline style for static visuals — use a Tailwind utility. style is only for dynamic/runtime values (transform/animation, runtime width/height/opacity) or CSS-variable (--*) injection.' };
const SEL_NATIVE_FORM = { selector: "JSXOpeningElement[name.name=/^(button|input|select|textarea)$/]", message: 'Use @cloud/ui primitives, not native form controls: <button>→Button, <input>→Input, <select>→Select, <textarea>→Textarea. Compose under apps/*/components/. See the ui skill.' };
const SEL_FRAG_MAP_ARROW = { selector: "CallExpression[callee.property.name='map'] > ArrowFunctionExpression > JSXFragment", message: "A .map() callback must not return a bare <>…</> Fragment — use a host element or @cloud/ui component (it can't carry a key, and loops need a container). See the ui skill." };
const SEL_FRAG_MAP_BLOCK = { selector: "CallExpression[callee.property.name='map'] > ArrowFunctionExpression > BlockStatement > ReturnStatement > JSXFragment", message: "A .map() callback must not return a bare <>…</> Fragment — use a host element or @cloud/ui component (it can't carry a key, and loops need a container). See the ui skill." };
const SEL_CARD_PADDING = { selector: "JSXOpeningElement[name.name='Card'] JSXAttribute[name.name='className'] Literal[value=/(?:^|\\s)(?:[a-z-]+:)*p(?:[xytrblse])?-/]", message: 'Card owns no padding — put content in the slots (CardHeader/CardContent/CardFooter), which pad via `size`. A `p-*` on Card is the hand-rolled-card smell. See packages/ui/src/components/ui/card.tsx.' };
// A content-driven height class (`h-auto`/`h-fit`/`h-min`/`h-max`) in className
// can't grow a *sized* Button/Toggle: their size variants set a custom token
// (`h-control-*`) that tailwind-merge can't dedupe against a standard `h-*` class,
// so the override silently no-ops. The fix is the variant the components already
// expose — `size="auto"`. The important forms (`h-auto!` / `!h-auto`) are the
// sanctioned force-override and pass: the (?:^|\s)…(?:\s|$) boundaries don't match
// across the `!`. Like the arbitrary-value ban, it ships as a Literal +
// TemplateElement pair so `cn("h-auto")` and a backtick className are both caught
// (computed/variable classNames and renamed/wrapped components are not — same
// name-match limit as the base-ui selectors).
const SEL_HAUTO_SIZE_LITERAL = { selector: "JSXOpeningElement[name.name=/^(Button|Toggle)$/] JSXAttribute[name.name='className'] Literal[value=/(?:^|\\s)(?:[a-z-]+:)*h-(?:auto|fit|min|max)(?:\\s|$)/]", message: "Don't set a content-driven height on a Button/Toggle via className (h-auto/h-fit/h-min/h-max) — its sized variants set a custom h-control-* token that tailwind-merge can't dedupe against an h-* class, so it silently no-ops. Use size=\"auto\"; force a sized variant only with the important form (e.g. h-auto!). See the ui skill." };
const SEL_HAUTO_SIZE_TEMPLATE = { selector: "JSXOpeningElement[name.name=/^(Button|Toggle)$/] JSXAttribute[name.name='className'] TemplateElement[value.cooked=/(?:^|\\s)(?:[a-z-]+:)*h-(?:auto|fit|min|max)(?:\\s|$)/]", message: "Don't set a content-driven height on a Button/Toggle via className (h-auto/h-fit/h-min/h-max) — its sized variants set a custom h-control-* token that tailwind-merge can't dedupe against an h-* class, so it silently no-ops. Use size=\"auto\"; force a sized variant only with the important form (e.g. h-auto!). See the ui skill." };

const STYLING = [SEL_ARBITRARY_LITERAL, SEL_ARBITRARY_TEMPLATE, SEL_CURSOR, SEL_INLINE_STYLE, SEL_NATIVE_FORM, SEL_FRAG_MAP_ARROW, SEL_FRAG_MAP_BLOCK];
const BASE_UI = [SEL_ASCHILD, SEL_TABLE, SEL_NATIVE_TABLE, SEL_NATIVE_PROGRESS, SEL_ONOPENCHANGE, SEL_CARD_PADDING, SEL_HAUTO_SIZE_LITERAL, SEL_HAUTO_SIZE_TEMPLATE];
const APP_SET = [SEL_PRISMA, SEL_USE_SERVER, ...BASE_UI, ...STYLING];

// ---- data-layer query rules (repository region only) -----------------------
// Anchoring on the `prisma`/`tx` BASE object is what makes these tractable:
// `prisma.user.findMany()` nests as callee.object.object.name='prisma', while
// the $-prefixed methods (`prisma.$queryRaw`, `prisma.$transaction`) have an
// Identifier base (callee.object.name), so banning the former never touches
// the latter.
// Rule 1 — reads use raw SQL; the query builder's READ methods are banned in
// the data layer. Writes keep the builder (create/update/…), so they're absent.
const SEL_RAW_QUERY = { selector: "CallExpression[callee.object.object.name=/^(prisma|tx)$/][callee.property.name=/^(findMany|findUnique|findUniqueOrThrow|findFirst|findFirstOrThrow|count|aggregate|groupBy)$/]", message: 'Reads use raw SQL via prisma.$queryRaw`…` (typed), not the query builder (findMany/findUnique/…). Writes keep the builder inside a transaction. See the db skill.' };
// Rule 2 — a read needs no transaction, not even several reads for a consistent
// snapshot. A legitimate $transaction always contains a write; flag one that
// contains NONE — no builder write, no $executeRawUnsafe call, no $executeRaw
// tagged template. (A write expressed as $queryRaw would false-positive, but
// that's its own anti-pattern; writes use $executeRaw.)
// Every write-detection clause is ANCHORED on the prisma/tx base — otherwise an
// incidental non-prisma call inside the callback (`seen.delete(id)`, `map.update(k)`)
// would match `callee.property.name` and falsely suppress the flag.
const SEL_NO_READ_TXN = { selector: "CallExpression[callee.object.name=/^(prisma|tx)$/][callee.property.name='$transaction']:not(:has(CallExpression[callee.object.object.name=/^(prisma|tx)$/][callee.property.name=/^(create|createMany|createManyAndReturn|update|updateMany|updateManyAndReturn|upsert|delete|deleteMany)$/])):not(:has(CallExpression[callee.object.name=/^(prisma|tx)$/][callee.property.name='$executeRawUnsafe'])):not(:has(TaggedTemplateExpression[tag.object.name=/^(prisma|tx)$/][tag.property.name='$executeRaw']))", message: 'No $transaction around reads — reads never need one, not even for a consistent snapshot. Transactions are only for multi-statement mutations needing atomicity. See the db skill.' };
const DATA_LAYER = [SEL_RAW_QUERY, SEL_NO_READ_TXN];

const syntax = (...sels) => ['error', ...sels];

// ---- custom rule: require-e2e-cell -----------------------------------------
// The kit's only custom ESLint rule. `no-restricted-syntax` can flag the
// PRESENCE of an AST node but cannot assert the ABSENCE of a comment (comments
// aren't in the esquery AST). Route handlers and middleware are e2e boundaries
// (team-context.md); this fails lint when one ships with no `@e2e-cell` marker,
// closing the gap check-e2e-orphans.mjs can't see (it only validates markers
// that already exist). Auth boundaries are semantic → stay an implementation.md
// nudge, not lintable.
const E2E_HTTP = '^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$';
const E2E_CELL_RE = /@e2e-cell(?:-skip)?\s+\w+=/; // a real marker/skip, not a prose mention
const requireE2eCell = {
  meta: {
    type: 'problem',
    docs: { description: 'route handlers and middleware must carry an @e2e-cell marker' },
    schema: [],
    messages: {
      missing:
        'This {{kind}} is an e2e boundary — add `/** @e2e-cell feature=<name> kind={{kind}} */` ' +
        '(or `/** @e2e-cell-skip reason=… */` to opt out on the record). See team-context.md.',
    },
  },
  create(context) {
    const src = context.sourceCode ?? context.getSourceCode();
    const file = context.filename ?? context.getFilename();
    const isRoute = /(?:^|[\\/])route\.[tj]sx?$/.test(file);
    const isMw = /(?:^|[\\/])middleware\.[tj]sx?$/.test(file);
    if (!isRoute && !isMw) return {};
    if (src.getAllComments().some(c => E2E_CELL_RE.test(c.value))) return {};

    let done = false;
    const kind = isRoute ? 'route' : 'middleware';
    const flag = node => {
      if (done) return;
      done = true;
      context.report({ node, messageId: 'missing', data: { kind } });
    };
    return isRoute
      ? {
          [`ExportNamedDeclaration > FunctionDeclaration[id.name=/${E2E_HTTP}/]`]: flag,
          [`ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name=/${E2E_HTTP}/]`]: flag,
          [`ExportNamedDeclaration > ExportSpecifier[exported.name=/${E2E_HTTP}/]`]: flag,
        }
      : {
          ExportDefaultDeclaration: flag,
          'ExportNamedDeclaration > FunctionDeclaration[id.name="middleware"]': flag,
          'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name="middleware"]': flag,
          'ExportNamedDeclaration > ExportSpecifier[exported.name="middleware"]': flag,
        };
  },
};
// ---- custom rule: stub-notice ----------------------------------------------
// A `*.stub.ts` is a temporary, importable forward-declaration of an unbuilt
// cross-module dependency — a function/type/service you build against now, or a
// permission code referenced before its owner ships (AGENTS 铁律 #8). Its
// existence is a standing two-audience TODO: the OWNER (@stub-owner) who must
// build the real thing, and the CONSUMER (@stub-consumer) depending on it now and
// responsible for the swap + delete. This rule surfaces that as a `pnpm lint`
// notice (Claude runs lint during dev, so the reminder reaches it), naming both
// from the @stub-* header so it's never anonymous, and nagging when the header is
// incomplete so the notice can't be silent. Severity is `warn`, NOT `error`: a
// stub is legitimately present mid-development. Removal is guidance (lint) +
// team-rule; the one hard gate is `/submit-work` (no *.stub ships to develop).
// Like require-e2e-cell, it asserts the PRESENCE/SHAPE of a comment, which
// no-restricted-syntax cannot (comments aren't in the esquery AST).
const STUB_FILE_RE = /\.stub\.[mc]?[jt]sx?$/;
const REQUIRED_STUB_TAGS = ['owner', 'consumer', 'reason'];
const stubTag = (text, name) => {
  const m = text.match(new RegExp(`@stub-${name}[ \\t]+(\\S[^\\r\\n]*?)[ \\t]*$`, 'm'));
  return m ? m[1].trim() : '';
};
const stubNotice = {
  meta: {
    type: 'suggestion',
    docs: { description: 'a *.stub.ts carries a complete @stub-* header and announces itself during lint until deleted' },
    schema: [],
    messages: {
      present:
        'STUB [{{kind}}] — owner `{{owner}}` must build this then this stub is deleted ' +
        '(needed now by `{{consumer}}`: {{reason}}). Import it now; swap to the owner’s real ' +
        'surface when it lands. This notice clears when the stub is gone.',
      incomplete:
        'Stub header incomplete (missing {{missing}}). A *.stub.ts MUST name who owns it and why — ' +
        'see context/injections/references/cross-module-stub.md.',
    },
  },
  create(context) {
    const file = context.filename ?? context.getFilename();
    if (!STUB_FILE_RE.test(file)) return {};
    const src = context.sourceCode ?? context.getSourceCode();
    return {
      Program(node) {
        const header = src.getAllComments().map(c => c.value).join('\n');
        const tags = Object.fromEntries(REQUIRED_STUB_TAGS.map(t => [t, stubTag(header, t)]));
        const missing = REQUIRED_STUB_TAGS.filter(t => !tags[t]).map(t => `@stub-${t}`);
        if (missing.length) {
          context.report({ node, messageId: 'incomplete', data: { missing: missing.join(', ') } });
          return;
        }
        context.report({
          node,
          messageId: 'present',
          data: {
            kind: stubTag(header, 'kind') || 'dep',
            owner: tags.owner,
            consumer: tags.consumer,
            reason: tags.reason,
          },
        });
      },
    };
  },
};
const nextKitPlugin = { meta: { name: 'eslint-plugin-next-kit', version: '0.0.0' }, rules: { 'require-e2e-cell': requireE2eCell, 'stub-notice': stubNotice } };

// ---- type-aware rules (no deprecated APIs) ---------------------------------
// `@typescript-eslint/no-deprecated` needs TYPE information, so this is the one
// region where the otherwise-parserless preset injects the typescript-eslint
// parser + `projectService` and turns the rule on. It is NOT a consumer opt-in:
// `bin/setup eslint` adds the `typescript-eslint` devDependency so the rule is
// active out of the box. Cost the consumer inherits: their TS lint becomes
// type-aware (slower), and a tsconfig must cover the linted files. `files` is
// SCOPED to source dirs (not bare **/*.ts): root config files and scripts/ are
// commonly outside the tsconfig, and `projectService` errors HARD on an
// uncovered file. A consumer already using `parserOptions.project` must drop it
// — `project` + `projectService` conflict. Exported for shape-testing.
export function typeAwareBlock(tseslint, files) {
  return {
    files,
    languageOptions: { parser: tseslint.parser, parserOptions: { projectService: true } },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: { '@typescript-eslint/no-deprecated': 'error' },
  };
}
// Loaded lazily: a repo momentarily without `typescript-eslint` installed still
// gets every syntax rule — only this block drops out (the setup tool adds the
// dep, so the gap is transient). Never let a missing dep kill the whole config.
function typeAwareBlocks(files) {
  let tseslint;
  try { tseslint = requireFrom('typescript-eslint'); } catch { return []; }
  return [typeAwareBlock(tseslint, files)];
}

// IMPORTANT: every glob used in a `files:` key MUST be extension-qualified
// (end in `*.{ts,tsx,js,jsx}`). A bare directory glob like `packages/**` does
// NOT match files under real ESLint flat config — the file is reported
// "ignored because no matching configuration was supplied" and the rules
// silently never apply. (minimatch matches bare `**`, so unit tests pass; only
// a real-ESLint check catches it — see tools/setup/tests/eslint-integration.test.ts.)
export function nextKitGuardrail({
  appApi = ['app/api/**/*.{ts,tsx,js,jsx}', 'src/app/api/**/*.{ts,tsx,js,jsx}'],
  packages = 'packages/**/*.{ts,tsx,js,jsx}',
  packagesDb = 'packages/db/**/*.{ts,tsx,js,jsx}',
  packagesI18n = 'packages/i18n/**/*.{ts,tsx,js,jsx}',
  packagesSecurity = 'packages/security/**/*.{ts,tsx,js,jsx}',
  packagesCache = 'packages/cache/**/*.{ts,tsx,js,jsx}',
  packagesStorage = 'packages/storage/**/*.{ts,tsx,js,jsx}',
  routeHandlers = ['app/**/route.{ts,tsx,js,jsx}', 'src/app/**/route.{ts,tsx,js,jsx}'],
  middleware = ['middleware.{ts,tsx,js,jsx}', 'src/middleware.{ts,tsx,js,jsx}'],
  repository = ['**/*.repository.{ts,tsx,js,jsx}'],
  // Cross-module forward-declaration stubs (extension-qualified per the glob note above).
  stubFiles = ['**/*.stub.{ts,tsx,mts,cts,js,jsx}'],
  // Source dirs for type-aware linting (no-deprecated). Scoped, not bare **/*.ts,
  // so root config files / scripts (commonly outside the tsconfig) don't trip
  // projectService's hard "file not in project" error.
  typeAware = ['app/**/*.{ts,tsx,mts,cts}', 'src/**/*.{ts,tsx,mts,cts}', 'apps/**/*.{ts,tsx,mts,cts}', 'packages/**/*.{ts,tsx,mts,cts}', 'service/**/*.{ts,tsx,mts,cts}'],
} = {}) {
  return [
    // ---- no-restricted-imports (non-overlapping regions) ----
    // Route handlers: the full global set PLUS the data-layer ban.
    { files: appApi, rules: { 'no-restricted-imports': imports([...ALL_PATHS, CLOUD_DB], [...ALL_PATTERNS, DATA_LAYER_PATTERN]) } },
    { ignores: [packagesSecurity, packagesCache, packagesStorage, packagesI18n, packagesDb, ...appApi], rules: { 'no-restricted-imports': imports(ALL_PATHS, ALL_PATTERNS) } },
    { files: [packagesSecurity], rules: { 'no-restricted-imports': imports(without(ALL_PATHS, BCRYPT_GROUP), ALL_PATTERNS) } },
    { files: [packagesCache], rules: { 'no-restricted-imports': imports(without(ALL_PATHS, CACHE_GROUP), ALL_PATTERNS) } },
    { files: [packagesStorage], rules: { 'no-restricted-imports': imports(without(ALL_PATHS, STORAGE_GROUP), ALL_PATTERNS) } },
    { files: [packagesI18n], rules: { 'no-restricted-imports': imports(ALL_PATHS, without(ALL_PATTERNS, [NEXT_INTL_PATTERN])) } },
    { files: [packagesDb], rules: { 'no-restricted-imports': imports(without(ALL_PATHS, [PRISMA_IMPORT]), ALL_PATTERNS) } },

    // ---- no-restricted-syntax (non-overlapping regions) ----
    { files: appApi, rules: { 'no-restricted-syntax': syntax(SEL_NEXT_RESPONSE_JSON, SEL_RESPONSE_JSON, ...APP_SET) } },
    // Region B excludes the data layer (it gets its own region below) so files match exactly one block.
    { ignores: [packages, ...appApi, ...repository], rules: { 'no-restricted-syntax': syntax(...APP_SET) } },
    // Data layer (*.repository.*): the app set PLUS the query rules (raw-SQL reads, no read-only transactions).
    // `ignores` keeps it mutually exclusive with A (appApi) and C/D/E (packages) — a repository file
    // under either of those matches only that region, so no last-block-wins selector drop.
    { files: repository, ignores: [packages, ...appApi], rules: { 'no-restricted-syntax': syntax(...APP_SET, ...DATA_LAYER) } },
    { files: [packagesDb], rules: { 'no-restricted-syntax': syntax(SEL_USE_SERVER) } },
    { files: [packagesI18n], rules: { 'no-restricted-syntax': syntax(SEL_PRISMA) } },
    { files: [packages], ignores: [packagesDb, packagesI18n], rules: { 'no-restricted-syntax': syntax(SEL_PRISMA, SEL_USE_SERVER) } },

    // ---- require-e2e-cell (route handlers + middleware carry an @e2e-cell marker) ----
    { files: [...routeHandlers, ...middleware], plugins: { 'next-kit': nextKitPlugin }, rules: { 'next-kit/require-e2e-cell': 'error' } },

    // ---- stub-notice (a *.stub.ts announces itself + must carry a complete @stub-* header) ----
    { files: stubFiles, plugins: { 'next-kit': nextKitPlugin }, rules: { 'next-kit/stub-notice': 'warn' } },

    // ---- type-aware: ban deprecated APIs (kit-delivered + active, not opt-in) ----
    ...typeAwareBlocks(typeAware),
  ];
}

export default nextKitGuardrail;
