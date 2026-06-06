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
const PRISMA_IMPORT = { name: '@prisma/client', message: 'Import the client and any model/enum types from @cloud/db. Under Prisma 7 the client generates to packages/db/generated/prisma — @prisma/client no longer resolves the model types; re-export them from @cloud/db rather than deep-importing generated internals.' };
const CLOUD_DB = { name: '@cloud/db', message: 'Route handlers must not touch the DB directly — call a service (service/<domain>/server/*.service.ts).' };
const DATA_LAYER_PATTERN = { group: ['**/*.repository', '**/*.mapper'], message: 'Route handlers delegate to a service — call service/<domain>/server/*.service.ts instead. Repository/mapper (data + VO layers) are invoked by the service, not the route.' };

const NEXT_AUTH_PATTERN = { group: ['next-auth/*'], message: "Use @cloud/permissions/server or @cloud/permissions/client. The team's auth library is not next-auth." };
const NEXT_INTL_PATTERN = { group: ['next-intl', 'next-intl/client'], message: 'Use @cloud/i18n (or @cloud/i18n/client for Client Components, @cloud/i18n/server for request config and server actions). Server Components may import getTranslations / getMessages from next-intl/server directly until @cloud/i18n/server re-exports them. Locales are ["en","zh-CN","ja"].' };
const VALIDATORS_PATTERN = { group: ['yup', 'joi', 'valibot', 'superstruct'], message: 'Use Zod for all input validation.' };
const EMOTION_PATTERN = { group: ['@emotion/*'], message: 'No CSS-in-JS. Use Tailwind utilities over @cloud/ui tokens.' };

const ALL_PATHS = [NEXT_AUTH, ...BCRYPT_GROUP, ...CACHE_GROUP, PRISMA_IMPORT, STYLED];
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
const SEL_ONOPENCHANGE = { selector: "JSXOpeningElement[name.name='Modal'] > JSXAttribute[name.name='onOpenChange']", message: '`Modal` renames the dialog callback to `onClose` — the wrapper maps it internally, so `onOpenChange` is silently dropped. base-ui primitives that forward the native callback (CommandDialog, Sheet, Drawer, Popover, DropdownMenu, HoverCard, Tooltip, …) correctly keep `onOpenChange`. See packages/ui/src/components/ui/modal.tsx.' };
const SEL_ARBITRARY_LITERAL = { selector: "JSXAttribute[name.name='className'] Literal[value=/(?:^|\\s)(?!(?:[a-z-]+:)*(?:w|h|min-w|max-w|min-h|max-h)-\\[)(?:[a-z-]+:)*[a-z-]+-\\[/]", message: 'No arbitrary Tailwind values except w-/h-/min-w-/max-w-/min-h-/max-h-. Use a @cloud/ui design token; compose tokens via a named @utility, never inline [...]. See the ui skill.' };
const SEL_ARBITRARY_TEMPLATE = { selector: "JSXAttribute[name.name='className'] TemplateElement[value.cooked=/(?:^|\\s)(?!(?:[a-z-]+:)*(?:w|h|min-w|max-w|min-h|max-h)-\\[)(?:[a-z-]+:)*[a-z-]+-\\[/]", message: 'No arbitrary Tailwind values except w-/h-/min-w-/max-w-/min-h-/max-h-. Use a @cloud/ui design token; compose tokens via a named @utility, never inline [...]. See the ui skill.' };
const SEL_CURSOR = { selector: "JSXOpeningElement[name.name=/^[a-z]/]:has(JSXAttribute[name.name='onClick']):not(:has(JSXAttribute[name.name='className'] Literal[value=/(?:^|\\s)cursor-(?:pointer|not-allowed)(?:\\s|$)/]))", message: 'Clickable native elements (onClick) need a static cursor-pointer (or cursor-not-allowed) in className. For interactive UI, use a @cloud/ui primitive — it owns its cursor.' };
const SEL_INLINE_STYLE = { selector: "JSXAttribute[name.name='style'] Property[value.type='Literal']:not([key.value=/^--/])", message: 'No inline style for static visuals — use a Tailwind utility. style is only for dynamic/runtime values (transform/animation, runtime width/height/opacity) or CSS-variable (--*) injection.' };
const SEL_NATIVE_FORM = { selector: "JSXOpeningElement[name.name=/^(button|input|select|textarea)$/]", message: 'Use @cloud/ui primitives, not native form controls: <button>→Button, <input>→Input, <select>→Select, <textarea>→Textarea. Compose under apps/*/components/. See the ui skill.' };
const SEL_FRAG_MAP_ARROW = { selector: "CallExpression[callee.property.name='map'] > ArrowFunctionExpression > JSXFragment", message: "A .map() callback must not return a bare <>…</> Fragment — use a host element or @cloud/ui component (it can't carry a key, and loops need a container). See the ui skill." };
const SEL_FRAG_MAP_BLOCK = { selector: "CallExpression[callee.property.name='map'] > ArrowFunctionExpression > BlockStatement > ReturnStatement > JSXFragment", message: "A .map() callback must not return a bare <>…</> Fragment — use a host element or @cloud/ui component (it can't carry a key, and loops need a container). See the ui skill." };

const STYLING = [SEL_ARBITRARY_LITERAL, SEL_ARBITRARY_TEMPLATE, SEL_CURSOR, SEL_INLINE_STYLE, SEL_NATIVE_FORM, SEL_FRAG_MAP_ARROW, SEL_FRAG_MAP_BLOCK];
const BASE_UI = [SEL_ASCHILD, SEL_TABLE, SEL_ONOPENCHANGE];
const APP_SET = [SEL_PRISMA, SEL_USE_SERVER, ...BASE_UI, ...STYLING];

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
const nextKitPlugin = { meta: { name: 'eslint-plugin-next-kit', version: '0.0.0' }, rules: { 'require-e2e-cell': requireE2eCell } };

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
  routeHandlers = ['app/**/route.{ts,tsx,js,jsx}', 'src/app/**/route.{ts,tsx,js,jsx}'],
  middleware = ['middleware.{ts,tsx,js,jsx}', 'src/middleware.{ts,tsx,js,jsx}'],
} = {}) {
  return [
    // ---- no-restricted-imports (non-overlapping regions) ----
    // Route handlers: the full global set PLUS the data-layer ban.
    { files: appApi, rules: { 'no-restricted-imports': imports([...ALL_PATHS, CLOUD_DB], [...ALL_PATTERNS, DATA_LAYER_PATTERN]) } },
    { ignores: [packagesSecurity, packagesCache, packagesI18n, packagesDb, ...appApi], rules: { 'no-restricted-imports': imports(ALL_PATHS, ALL_PATTERNS) } },
    { files: [packagesSecurity], rules: { 'no-restricted-imports': imports(without(ALL_PATHS, BCRYPT_GROUP), ALL_PATTERNS) } },
    { files: [packagesCache], rules: { 'no-restricted-imports': imports(without(ALL_PATHS, CACHE_GROUP), ALL_PATTERNS) } },
    { files: [packagesI18n], rules: { 'no-restricted-imports': imports(ALL_PATHS, without(ALL_PATTERNS, [NEXT_INTL_PATTERN])) } },
    { files: [packagesDb], rules: { 'no-restricted-imports': imports(without(ALL_PATHS, [PRISMA_IMPORT]), ALL_PATTERNS) } },

    // ---- no-restricted-syntax (non-overlapping regions) ----
    { files: appApi, rules: { 'no-restricted-syntax': syntax(SEL_NEXT_RESPONSE_JSON, SEL_RESPONSE_JSON, ...APP_SET) } },
    { ignores: [packages, ...appApi], rules: { 'no-restricted-syntax': syntax(...APP_SET) } },
    { files: [packagesDb], rules: { 'no-restricted-syntax': syntax(SEL_USE_SERVER) } },
    { files: [packagesI18n], rules: { 'no-restricted-syntax': syntax(SEL_PRISMA) } },
    { files: [packages], ignores: [packagesDb, packagesI18n], rules: { 'no-restricted-syntax': syntax(SEL_PRISMA, SEL_USE_SERVER) } },

    // ---- require-e2e-cell (route handlers + middleware carry an @e2e-cell marker) ----
    { files: [...routeHandlers, ...middleware], plugins: { 'next-kit': nextKitPlugin }, rules: { 'next-kit/require-e2e-cell': 'error' } },
  ];
}

export default nextKitGuardrail;
