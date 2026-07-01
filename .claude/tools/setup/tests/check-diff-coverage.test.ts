import { describe, expect, it } from 'vitest';
// @ts-expect-error — untyped .mjs
import { parseLcov, parseDiff, parseIgnores, computeReport, formatReport } from '../../../context/check-diff-coverage.mjs';

describe('parseLcov', () => {
  it('maps each SF file to its DA line→hits', () => {
    const lcov = [
      'SF:src/a.ts',
      'DA:1,3',
      'DA:2,0',
      'end_of_record',
      'SF:src/b.ts',
      'DA:10,1',
      'end_of_record',
    ].join('\n');
    const m = parseLcov(lcov);
    expect(m.get('src/a.ts')?.get(1)).toBe(3);
    expect(m.get('src/a.ts')?.get(2)).toBe(0);
    expect(m.get('src/b.ts')?.get(10)).toBe(1);
    expect(m.has('src/a.ts')).toBe(true);
  });
});

describe('parseDiff', () => {
  it('collects added line numbers per file from unified=0 hunks', () => {
    const diff = [
      'diff --git a/src/a.ts b/src/a.ts',
      '--- a/src/a.ts',
      '+++ b/src/a.ts',
      '@@ -1,0 +2 @@',          // single added line at 2
      '+const x = 1;',
      '@@ -5,2 +6,3 @@',        // 3 lines added starting at 6
      '+a',
      '+b',
      '+c',
      'diff --git a/src/del.ts b/src/del.ts',
      '+++ b/src/del.ts',
      '@@ -3,2 +3,0 @@',        // pure deletion → no added lines
      '-gone',
    ].join('\n');
    const m = parseDiff(diff);
    expect([...m.get('src/a.ts')].sort((p, q) => p - q)).toEqual([2, 6, 7, 8]);
    expect(m.get('src/del.ts')?.size ?? 0).toBe(0);
  });

  it('ignores deleted files (+++ /dev/null)', () => {
    const diff = ['--- a/gone.ts', '+++ /dev/null', '@@ -1 +0,0 @@', '-x'].join('\n');
    expect(parseDiff(diff).has('/dev/null')).toBe(false);
  });
});

describe('parseIgnores', () => {
  it('maps lines carrying a v8-ignore hint to their reason (or null)', () => {
    const src = [
      'const a = 1;',
      '/* v8 ignore next -- unreachable: defensive */',
      'throw new Error("x");',
      'const b = 2; /* v8 ignore next */',
    ].join('\n');
    const m = parseIgnores(src);
    expect(m.has(1)).toBe(false);
    expect(m.get(2)).toBe('unreachable: defensive');
    expect(m.get(4)).toBe(null);
  });

  it('captures a reason containing an asterisk', () => {
    const m = parseIgnores('/* v8 ignore next -- defensive: * thrown */');
    expect(m.get(1)).toBe('defensive: * thrown');
  });
});

describe('computeReport', () => {
  const lcovByFile = new Map([
    ['src/a.ts', new Map([[1, 3], [2, 0], [3, 0]])], // line1 covered, 2&3 uncovered
  ]);

  it('FAILs on an uncovered, unannotated changed line', () => {
    const r = computeReport({
      changedByFile: new Map([['src/a.ts', new Set([1, 2])]]),
      lcovByFile,
      ignoresByFile: new Map(),
    });
    expect(r.fail).toBe(true);
    expect(r.files[0].covered).toEqual([1]);
    expect(r.files[0].uncovered).toEqual([2]);
    expect(r.summary.totalUncovered).toBe(1);
  });

  it('exempts an uncovered line when an annotated ignore covers it', () => {
    const ignoreMap = new Map([[3, 'generated code']]);
    const r = computeReport({
      changedByFile: new Map([['src/a.ts', new Set([1, 3])]]),
      lcovByFile,
      ignoresByFile: new Map([['src/a.ts', ignoreMap]]),
    });
    expect(r.fail).toBe(false);
    expect(r.files[0].exempted).toEqual([{ line: 3, reason: 'generated code' }]);
  });

  it('FAILs on an ignore with no reason', () => {
    const r = computeReport({
      changedByFile: new Map([['src/a.ts', new Set([2])]]),
      lcovByFile,
      ignoresByFile: new Map([['src/a.ts', new Map([[2, null]])]]),
    });
    expect(r.fail).toBe(true);
    expect(r.files[0].noReason).toEqual([2]);
  });

  it('skips files with no lcov entry (not instrumented)', () => {
    const r = computeReport({
      changedByFile: new Map([['README.md', new Set([1, 2])]]),
      lcovByFile,
      ignoresByFile: new Map(),
    });
    expect(r.files).toEqual([]);
    expect(r.fail).toBe(false);
  });

  it('skips changed lines with no DA entry (comments/types/blank)', () => {
    const r = computeReport({
      changedByFile: new Map([['src/a.ts', new Set([1, 99])]]), // 99 has no DA
      lcovByFile,
      ignoresByFile: new Map(),
    });
    expect(r.files[0].covered).toEqual([1]);
    expect(r.summary.totalCoverable).toBe(1);
  });

  it('exempts the line BELOW an own-line ignore comment (v8 ignore next)', () => {
    const r = computeReport({
      changedByFile: new Map([['src/a.ts', new Set([2, 3])]]), // 2 = comment, 3 = code
      lcovByFile: new Map([['src/a.ts', new Map([[3, 0]])]]),   // line 3 uncovered; line 2 has no DA
      ignoresByFile: new Map([['src/a.ts', new Map([[2, 'generated']])]]), // ignore on comment line 2
    });
    expect(r.fail).toBe(false);
    expect(r.files[0].exempted).toEqual([{ line: 3, reason: 'generated' }]);
    expect(r.files[0].uncovered).toEqual([]);
  });
});

describe('formatReport', () => {
  it('renders a human-readable summary with reasons and a verdict', () => {
    const result = {
      summary: { totalCoverable: 2, totalCovered: 1, totalUncovered: 1, totalExempted: 1, totalNoReason: 0 },
      files: [{ file: 'src/a.ts', covered: [1], uncovered: [2], exempted: [{ line: 3, reason: 'generated code' }], noReason: [] }],
      fail: true,
    };
    const md = formatReport(result);
    expect(md).toContain('# Diff-coverage report');
    expect(md).toContain('src/a.ts');
    expect(md).toContain('Uncovered (no test, no reason): 2');
    expect(md).toContain('generated code');
    expect(md).toMatch(/FAIL|❌/);
  });
});

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_SRC = join(dirname(fileURLToPath(import.meta.url)), '../../../context/check-diff-coverage.mjs');
const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, stdio: 'pipe' });

function gitRepo() {
  const d = mkdtempSync(join(tmpdir(), 'diffcov-'));
  git(d, 'init', '-q', '-b', 'main');
  git(d, 'config', 'user.email', 't@t.t');
  git(d, 'config', 'user.name', 't');
  mkdirSync(join(d, 'src'), { recursive: true });
  writeFileSync(join(d, 'src/a.ts'), 'export const base = 1;\n');
  git(d, 'add', '.');
  git(d, 'commit', '-qm', 'base');
  cpSync(SCRIPT_SRC, join(d, 'check-diff-coverage.mjs'));
  mkdirSync(join(d, 'coverage'), { recursive: true });
  return d;
}

function run(d: string) {
  try {
    const out = execFileSync(process.execPath, ['check-diff-coverage.mjs'], {
      cwd: d, env: { ...process.env, DIFF_COVERAGE_BASE: 'main' }, stdio: 'pipe', encoding: 'utf8',
    });
    return { code: 0, out };
  } catch (e: any) {
    return { code: e.status as number, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

describe('check-diff-coverage CLI', () => {
  it('exits non-zero and reports the uncovered changed line', () => {
    const d = gitRepo();
    writeFileSync(join(d, 'src/a.ts'), 'export const base = 1;\nexport const added = 2;\n');
    writeFileSync(join(d, 'coverage/lcov.info'), ['SF:src/a.ts', 'DA:1,1', 'DA:2,0', 'end_of_record', ''].join('\n'));
    const r = run(d);
    expect(r.code).toBe(1);
    expect(readFileSync(join(d, 'coverage/diff-coverage.md'), 'utf8')).toMatch(/Uncovered/);
  });

  it('exits zero when the changed line is covered', () => {
    const d = gitRepo();
    writeFileSync(join(d, 'src/a.ts'), 'export const base = 1;\nexport const added = 2;\n');
    writeFileSync(join(d, 'coverage/lcov.info'), ['SF:src/a.ts', 'DA:1,1', 'DA:2,5', 'end_of_record', ''].join('\n'));
    expect(run(d).code).toBe(0);
  });

  it('exits zero when an uncovered changed line carries an inline reason', () => {
    const d = gitRepo();
    writeFileSync(join(d, 'src/a.ts'), 'export const base = 1;\nexport const added = 2; /* v8 ignore next -- generated */\n');
    // line 2 is changed and uncovered (DA:2,0) but annotated inline with a reason → exempt
    writeFileSync(join(d, 'coverage/lcov.info'), ['SF:src/a.ts', 'DA:1,1', 'DA:2,0', 'end_of_record', ''].join('\n'));
    expect(run(d).code).toBe(0);
  });

  it('exits zero when an own-line ignore comment above an uncovered changed line carries a reason', () => {
    const d = gitRepo();
    writeFileSync(join(d, 'src/a.ts'), 'export const base = 1;\n/* v8 ignore next -- generated */\nexport const added = 2;\n');
    // line 2 = own-line ignore comment; line 3 = the uncovered code it exempts
    writeFileSync(join(d, 'coverage/lcov.info'), ['SF:src/a.ts', 'DA:1,1', 'DA:3,0', 'end_of_record', ''].join('\n'));
    expect(run(d).code).toBe(0);
  });
});
