import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spliceGuardrail, CURRENT_VERSION, type SpliceParams } from '../patch-eslint.ts';
import { addDevDependency } from '../patch-json.ts';
import type { SetupSummary } from '../types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
// commands -> src -> setup -> tools -> .claude/context/eslint.nextkit.mjs
const PRESET_SRC = join(HERE, '../../../../context/eslint.nextkit.mjs');
const PRESET_DEST = 'eslint.nextkit.mjs';
const CONFIG_CANDIDATES = ['eslint.config.ts', 'eslint.config.mjs', 'eslint.config.js', 'eslint.config.cjs'];

export interface SetupEslintOptions {
  rootDir: string;
  dryRun: boolean;
}

function findConfig(rootDir: string): string {
  for (const c of CONFIG_CANDIDATES) {
    if (existsSync(join(rootDir, c))) return c;
  }
  const legacy = ['.eslintrc', '.eslintrc.json', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.yml'];
  if (legacy.some(l => existsSync(join(rootDir, l)))) {
    throw new Error('setup eslint: only legacy .eslintrc* found. This tool requires flat config (eslint.config.*). Migrate first, or hand-port from context/eslint.nextkit.mjs.');
  }
  throw new Error('setup eslint: no eslint.config.{ts,mjs,js,cjs} found in ' + rootDir);
}

function detectParams(rootDir: string): SpliceParams {
  // Monorepo when apps/ exists: route handlers live under apps/*/app/api.
  if (existsSync(join(rootDir, 'apps'))) {
    return { appApi: ['apps/*/app/api/**/*.{ts,tsx,js,jsx}'] };
  }
  return {}; // defaults cover app/api/** and src/app/api/**
}

export async function setupEslint(opts: SetupEslintOptions): Promise<SetupSummary> {
  const { rootDir, dryRun } = opts;
  const configRel = findConfig(rootDir);
  const configPath = join(rootDir, configRel);
  const params = detectParams(rootDir);

  const before = readFileSync(configPath, 'utf8');
  const result = spliceGuardrail(before, params, configRel);

  const filesWritten: string[] = [];
  const patches: SetupSummary['patches'] = [];

  if (result.kind === 'manual') {
    patches.push({ file: configRel, status: 'manual', detail: `${result.reason} — ${result.instructions}` });
    return { filesWritten, patches, verifyHint: 'Resolve the manual step above, then re-run bin/setup eslint.' };
  }
  if (result.kind === 'noop') {
    patches.push({ file: configRel, status: 'noop', detail: result.reason });
    return { filesWritten, patches, verifyHint: 'Already wired. No changes.' };
  }

  // 'patched' (fresh) and 'upgrade' (clean v4+ spread) both carry .text and need
  // the preset (re-)copied — that re-copy is what actually delivers the new rule set.
  if (!dryRun) {
    copyFileSync(PRESET_SRC, join(rootDir, PRESET_DEST));
    writeFileSync(configPath, result.text);
    // The type-aware rule (@typescript-eslint/no-deprecated, v8) needs the
    // typescript-eslint parser+plugin present; add it so the rule is active
    // without consumer action. Idempotent: respects an existing pin.
    if (existsSync(join(rootDir, 'package.json'))) {
      const dep = addDevDependency(rootDir, 'typescript-eslint', '^8.0.0');
      patches.push({ file: 'package.json', status: dep.kind, detail: dep.kind === 'patched' ? dep.detail : `typescript-eslint ${dep.reason}` });
    }
  }
  filesWritten.push(PRESET_DEST);
  patches.push({
    file: configRel,
    status: 'patched',
    detail:
      result.kind === 'upgrade'
        ? `upgraded v${result.from} → v${CURRENT_VERSION} (re-copied preset, bumped sentinel)`
        : `spliced nextKitGuardrail import + spread (v${CURRENT_VERSION})`,
  });

  return {
    filesWritten,
    patches,
    verifyHint:
      'Config splice done. CONFIG-PARSE CHECK: run `pnpm exec eslint --print-config ' +
      (params.appApi ? 'apps/<your-app>/app/page.tsx' : 'app/page.tsx') +
      '` to confirm the config loads (this verifies the splice, NOT the codebase). ' +
      'Then optionally run `pnpm lint` as a BASELINE SCAN — its findings are pre-existing debt, deferred work, not a setup failure. ' +
      'TYPE-AWARE RULE: no-deprecated is now active via `projectService`. If your config already sets `parserOptions.project`, REMOVE it — `project` + `projectService` conflict and break TS linting with a hard parse error.',
  };
}
