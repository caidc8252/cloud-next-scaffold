#!/usr/bin/env node
// next-kit:diff-coverage v1
// Changed-line coverage gate. Notes that used to live in the setup reference:
// - Base ref: diffs against the merge-base with origin/main → origin/master → main → master;
//   if none match (or no `origin`), exits code 2 asking for DIFF_COVERAGE_BASE.
//   Exit 2 = setup problem, exit 1 = gate failure, exit 0 = pass.
// - Reasoned exemptions live in source: `/* v8 ignore next -- <reason> */` passes; a bare
//   ignore with no `-- <reason>` fails (reason categories audited at code review).
// - The first half must run the FULL vitest suite (one lcov covering every spec); if the
//   consumer splits unit/integration, point it at the command that runs both.
//
// Diff-coverage gate. Joins `git diff` against coverage/lcov.info: every
// changed, coverable line must be covered by a test OR carry an inline
// `/* v8 ignore next -- <reason> */`. Writes coverage/diff-coverage.md and
// exits non-zero on an uncovered, unreasoned changed line.
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

/**
 * Map<line, reason|null> for source lines carrying a `v8 ignore next` hint —
 * the documented team form. Range/file markers (`v8 ignore start|stop|file`)
 * are deliberately ignored: they don't target a single line, and v8 already
 * drops coverage data for the lines they cover, so honoring them here would
 * mis-flag the ordinary line that follows.
 */
export function parseIgnores(sourceText) {
  const ignores = new Map();
  sourceText.split('\n').forEach((text, i) => {
    const hint = text.match(/\/\*\s*v8 ignore next\b.*?\*\//);
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
 *  - exempted: an ignore with a reason covers this line
 *  - noReason: an ignore covers this line but has NO reason   -> FAIL
 *  - uncovered: DA hits === 0, not exempted                   -> FAIL
 *  - covered: DA hits > 0
 *  - (no DA entry & not exempted -> not coverable -> skipped)
 */
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
      // This line is exempted by an inline ignore on the same line, or by a
      // standalone ignore comment directly above it. An inline ignore that
      // shares a coverable code line above does NOT carry over — it exempted
      // only its own line, so the line below stands on its own coverage.
      const ownIgnore = ignores.has(line);
      const prevStandalone = ignores.has(line - 1) && !lcov.has(line - 1);
      if (ownIgnore || prevStandalone) {
        const reason = ownIgnore ? ignores.get(line) : ignores.get(line - 1);
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
  return { files, summary, fail: summary.totalUncovered + summary.totalNoReason > 0 };
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

/** lcov SF paths can be absolute; normalize to repo-root-relative for matching. */
function normalizeLcovKeys(lcovByFile, root) {
  const out = new Map();
  const prefix = root.endsWith('/') ? root : root + '/';
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
  if (!existsSync('coverage/lcov.info')) {
    console.error('coverage/lcov.info not found — run `vitest run --coverage --coverage.reporter=lcov` first.');
    process.exit(2);
  }
  // `git diff` emits repo-root-relative paths regardless of cwd, so resolve lcov
  // keys and source reads against the git root — not cwd. This lets the gate run
  // from a package subdirectory (e.g. apps/web) and still match the diff.
  let root;
  try {
    root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  } catch {
    console.error('Not inside a git repository.');
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
  const lcovByFile = normalizeLcovKeys(parseLcov(readFileSync('coverage/lcov.info', 'utf8')), root);
  const ignoresByFile = new Map();
  for (const file of changedByFile.keys()) {
    const abs = resolve(root, file);
    if (existsSync(abs)) ignoresByFile.set(file, parseIgnores(readFileSync(abs, 'utf8')));
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
    console.error('Diff-coverage gate FAILED: cover the lines above, or annotate `/* v8 ignore next -- <reason> */`.');
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
