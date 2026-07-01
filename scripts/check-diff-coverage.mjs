#!/usr/bin/env node
// next-kit:diff-coverage v2
//
// Diff-coverage gate. Joins `git diff` against coverage/lcov.info: at least
// MIN_COVERED_RATIO (95%) of changed, coverable lines must be covered by a test;
// the rest may go uncovered OR carry an inline `/* v8 ignore next -- <reason> */`
// (reasoned-ignore lines drop out of the ratio entirely). A bare ignore without a
// reason always fails. Writes coverage/diff-coverage.md and exits non-zero when
// the ratio is missed or a reasonless ignore is present.
// Self-contained: node + git only. Pure functions are exported for tests;
// the CLI runs only when invoked directly.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

/** Parse lcov.info → Map<file, Map<line, hits>>. */
export function parseLcov(text) {
  const files = new Map();
  let current = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('SF:')) {
      current = line.slice(3);
      files.set(current, new Map());
    } else if (line.startsWith('DA:') && current) {
      const [ln, hits] = line.slice(3).split(',');
      files.get(current).set(Number(ln), Number(hits));
    } else if (line === 'end_of_record') {
      current = null;
    }
  }
  return files;
}

/** Parse `git diff --unified=0` → Map<file, Set<addedLine>> (new-side lines). */
export function parseDiff(diffText) {
  const changed = new Map();
  let current = null;
  for (const line of diffText.split('\n')) {
    if (line.startsWith('+++ ')) {
      const file = line.match(/^\+\+\+ b\/(.+)$/);
      current = file ? file[1] : null; // +++ /dev/null (deletion) or no-prefix → no current file
      if (current && !changed.has(current)) changed.set(current, new Set());
      continue;
    }
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (hunk && current) {
      const start = Number(hunk[1]);
      const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
      for (let i = 0; i < count; i++) changed.get(current).add(start + i);
    }
  }
  return changed;
}

/** Map<line, reason|null> for source lines carrying a v8-ignore hint. */
export function parseIgnores(sourceText) {
  const ignores = new Map();
  sourceText.split('\n').forEach((text, i) => {
    const hint = text.match(/\/\*\s*v8 ignore\b.*?\*\//);
    if (!hint) return;
    const reason = hint[0].match(/--\s*(.+?)\s*\*\//);
    ignores.set(i + 1, reason ? reason[1].trim() : null);
  });
  return ignores;
}

/**
 * Classify changed lines. A v8-ignore hint exempts the line it targets: an
 * own-line ignore comment exempts the NEXT line (v8 "ignore next" semantics,
 * the documented form); an inline ignore exempts its own line.
 *  - exempted: an ignore with a reason covers this line       -> out of ratio
 *  - noReason: an ignore covers this line but has NO reason   -> hard FAIL
 *  - uncovered: DA hits === 0, not exempted                   -> counts against ratio
 *  - covered: DA hits > 0                                     -> counts toward ratio
 *  - (no DA entry & not exempted -> not coverable -> skipped)
 * The gate FAILs when covered/coverable < MIN_COVERED_RATIO, or on any noReason.
 */
// Minimum share of changed, coverable lines that must be covered to pass.
// Reasoned-ignore lines are excluded from the ratio; a bare ignore still hard-fails.
export const MIN_COVERED_RATIO = 0.95;

export function computeReport({ changedByFile, lcovByFile, ignoresByFile }) {
  const files = [];
  const summary = { totalCoverable: 0, totalCovered: 0, totalUncovered: 0, totalExempted: 0, totalNoReason: 0 };
  for (const [file, changed] of changedByFile) {
    const lcov = lcovByFile.get(file);
    if (!lcov) continue; // not instrumented
    const ignores = ignoresByFile.get(file) ?? new Map();
    const covered = [], uncovered = [], exempted = [], noReason = [];
    for (const line of [...changed].sort((a, b) => a - b)) {
      // A standalone ignore comment (an ignore on a line with no coverage data
      // of its own) targets the NEXT line — skip the comment line itself.
      if (ignores.has(line) && !lcov.has(line)) continue;
      // This line is exempted by an inline ignore (same line) or an own-line
      // ignore comment directly above it.
      const reason = ignores.has(line) ? ignores.get(line)
        : ignores.has(line - 1) ? ignores.get(line - 1)
        : undefined;
      if (ignores.has(line) || ignores.has(line - 1)) {
        if (reason) exempted.push({ line, reason });
        else noReason.push(line);
        continue;
      }
      const hits = lcov.get(line);
      if (hits === undefined) continue; // not coverable
      if (hits > 0) covered.push(line);
      else uncovered.push(line);
    }
    if (covered.length || uncovered.length || exempted.length || noReason.length) {
      files.push({ file, covered, uncovered, exempted, noReason });
      summary.totalCovered += covered.length;
      summary.totalUncovered += uncovered.length;
      summary.totalExempted += exempted.length;
      summary.totalNoReason += noReason.length;
      summary.totalCoverable += covered.length + uncovered.length;
    }
  }
  const ratio = summary.totalCoverable === 0 ? 1 : summary.totalCovered / summary.totalCoverable;
  return { files, summary, ratio, fail: summary.totalNoReason > 0 || ratio < MIN_COVERED_RATIO };
}

/** Render the report Markdown written to coverage/diff-coverage.md. */
export function formatReport(result) {
  const { summary, files, fail } = result;
  const lines = [];
  lines.push('# Diff-coverage report', '');
  lines.push(
    `Changed coverable lines: ${summary.totalCovered}/${summary.totalCoverable} covered, ` +
      `${summary.totalExempted} exempted, ${summary.totalUncovered} uncovered, ` +
      `${summary.totalNoReason} ignore(s) without a reason.`,
    '',
  );
  const pct = summary.totalCoverable === 0 ? 100 : Math.floor((summary.totalCovered / summary.totalCoverable) * 100);
  lines.push(`Covered ${pct}% of changed coverable lines (threshold ${Math.round(MIN_COVERED_RATIO * 100)}%).`, '');
  lines.push(fail ? '**Verdict: FAIL ❌**' : '**Verdict: PASS ✅**', '');
  for (const f of files) {
    lines.push(`## ${f.file}`);
    if (f.covered.length) lines.push(`- Covered: ${f.covered.join(', ')}`);
    if (f.uncovered.length) lines.push(`- Uncovered (no test, no reason): ${f.uncovered.join(', ')}`);
    if (f.noReason.length) lines.push(`- Ignored WITHOUT a reason (not allowed): ${f.noReason.join(', ')}`);
    for (const e of f.exempted) lines.push(`- Exempted L${e.line}: ${e.reason}`);
    lines.push('');
  }
  if (!files.length) lines.push('No changed, instrumented lines.', '');
  return lines.join('\n');
}

/** lcov SF paths can be absolute; normalize to repo-relative for matching. */
function normalizeLcovKeys(lcovByFile, cwd) {
  const out = new Map();
  const prefix = cwd.endsWith('/') ? cwd : cwd + '/';
  for (const [file, lines] of lcovByFile) {
    const rel = file.startsWith(prefix) ? file.slice(prefix.length) : file;
    out.set(rel, lines);
  }
  return out;
}

function resolveBase() {
  if (process.env.DIFF_COVERAGE_BASE) return process.env.DIFF_COVERAGE_BASE;
  for (const ref of ['origin/main', 'origin/master', 'main', 'master']) {
    try {
      execFileSync('git', ['rev-parse', '--verify', '--quiet', ref], { stdio: 'pipe' });
      return ref;
    } catch {
      /* try next candidate */
    }
  }
  return 'origin/main';
}

function main() {
  const cwd = process.cwd();
  if (!existsSync('coverage/lcov.info')) {
    console.error('coverage/lcov.info not found — run `vitest run --coverage --coverage.reporter=lcov` first.');
    process.exit(2);
  }
  const base = resolveBase();
  let mergeBase;
  try {
    mergeBase = execFileSync('git', ['merge-base', base, 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    console.error(`Cannot find merge-base with '${base}'. Set DIFF_COVERAGE_BASE to your base branch.`);
    process.exit(2);
  }
  const diff = execFileSync('git', ['diff', '--unified=0', mergeBase], { encoding: 'utf8' });
  const changedByFile = parseDiff(diff);
  const lcovByFile = normalizeLcovKeys(parseLcov(readFileSync('coverage/lcov.info', 'utf8')), cwd);
  const ignoresByFile = new Map();
  for (const file of changedByFile.keys()) {
    if (existsSync(resolve(cwd, file))) ignoresByFile.set(file, parseIgnores(readFileSync(file, 'utf8')));
  }
  const result = computeReport({ changedByFile, lcovByFile, ignoresByFile });
  mkdirSync('coverage', { recursive: true });
  writeFileSync('coverage/diff-coverage.md', formatReport(result));
  const s = result.summary;
  console.log(
    `diff-coverage: ${s.totalCovered}/${s.totalCoverable} covered, ${s.totalExempted} exempted, ` +
      `${s.totalUncovered} uncovered, ${s.totalNoReason} unreasoned. → coverage/diff-coverage.md`,
  );
  if (result.fail) {
    console.error(
      `Diff-coverage gate FAILED: changed-line coverage is below ${Math.round(MIN_COVERED_RATIO * 100)}% ` +
        '(or a reasonless ignore is present). Cover the lines above, or annotate `/* v8 ignore next -- <reason> */`.',
    );
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
