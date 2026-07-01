import { existsSync, readFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addPackageScript, addDevDependency, appendGitignore } from '../patch-json.ts';
import type { SetupSummary } from '../types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
// commands -> src -> setup -> tools -> <repo root>
const SCRIPT_SRC = join(HERE, '../../../../context/check-diff-coverage.mjs');

const SENTINEL_RE = /\/\/ next-kit:diff-coverage v(\d+)/;
export const COVERAGE_VERSION = 2;
const SCRIPT_REL = 'scripts/check-diff-coverage.mjs';
const CHECK_CMD = 'vitest run --coverage --coverage.reporter=lcov --coverage.reporter=html && node scripts/check-diff-coverage.mjs';

export interface SetupCoverageOptions {
  rootDir: string;
  dryRun: boolean;
}

// Match @vitest/coverage-v8 to the consumer's vitest major (they must agree).
function coverageProviderRange(rootDir: string): string {
  try {
    const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8')) as {
      devDependencies?: Record<string, string>;
      dependencies?: Record<string, string>;
    };
    const vitest = pkg.devDependencies?.vitest ?? pkg.dependencies?.vitest;
    const major = vitest?.match(/^\D*(\d+)/)?.[1];
    if (major) return `^${major}.1.0`;
  } catch {
    /* fall through */
  }
  return '^2.1.0';
}

function install(rootDir: string, dryRun: boolean): SetupSummary {
  const patches: SetupSummary['patches'] = [];
  if (!dryRun) {
    mkdirSync(join(rootDir, 'scripts'), { recursive: true });
    copyFileSync(SCRIPT_SRC, join(rootDir, SCRIPT_REL));

    const script = addPackageScript(rootDir, 'check:diff-coverage', CHECK_CMD);
    patches.push(
      script.kind === 'conflict'
        ? { file: 'package.json', status: 'manual', detail: `check:diff-coverage drifted — set it to: ${CHECK_CMD}` }
        : { file: 'package.json', status: script.kind, detail: script.kind === 'patched' ? 'added check:diff-coverage' : 'check:diff-coverage already set' },
    );

    const dep = addDevDependency(rootDir, '@vitest/coverage-v8', coverageProviderRange(rootDir));
    patches.push({ file: 'package.json', status: dep.kind, detail: dep.kind === 'patched' ? dep.detail : `@vitest/coverage-v8 ${dep.reason}` });

    const gi = appendGitignore(rootDir, ['coverage/']);
    patches.push({ file: '.gitignore', status: gi.kind === 'patched' ? 'patched' : 'noop', detail: gi.kind === 'patched' ? gi.detail : 'entries present' });
  }
  return {
    filesWritten: [SCRIPT_REL],
    patches,
    verifyHint:
      `Diff-coverage gate wired (sentinel v${COVERAGE_VERSION}). Run \`pnpm check:diff-coverage\` at verification. ` +
      'It forces the lcov reporter, so no vitest.config change is needed. If your project splits unit/integration into ' +
      'separate test commands, point the first half of the script at your FULL Vitest suite so integration-only-covered ' +
      'lines are not flagged. Do NOT run it from setup — the verification phase is its trigger.',
  };
}

export async function setupCoverage(opts: SetupCoverageOptions): Promise<SetupSummary> {
  const { rootDir, dryRun } = opts;
  const scriptPath = join(rootDir, SCRIPT_REL);

  if (existsSync(scriptPath)) {
    const m = readFileSync(scriptPath, 'utf8').match(SENTINEL_RE);
    if (!m) {
      return {
        filesWritten: [],
        patches: [{ file: SCRIPT_REL, status: 'manual', detail: 'exists without a next-kit sentinel — consumer hand-rolled. Delete it to reinstall, or merge by hand.' }],
        verifyHint: 'Resolve the existing scripts/check-diff-coverage.mjs, then re-run bin/setup coverage.',
      };
    }
    const version = Number(m[1]);
    if (version === COVERAGE_VERSION) {
      return { filesWritten: [], patches: [{ file: SCRIPT_REL, status: 'noop', detail: `already at v${COVERAGE_VERSION}` }], verifyHint: 'Already wired. No changes.' };
    }
    if (version > COVERAGE_VERSION) {
      return {
        filesWritten: [],
        patches: [{ file: SCRIPT_REL, status: 'manual', detail: `found v${version} (newer than this kit's v${COVERAGE_VERSION}); do not downgrade` }],
        verifyHint: 'Consumer is on a newer kit. Ask before changing anything.',
      };
    }
    // older sentinel → reinstall the machine-owned script + reconcile package.json
  }
  return install(rootDir, dryRun);
}
