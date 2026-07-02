#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const DEFAULT_MARKER_ROOTS = 'apps/*/src apps/*/app apps/*/middleware.ts';
const MARKER_ROOTS = process.env.E2E_MARKER_ROOTS || DEFAULT_MARKER_ROOTS;
const SKIPPED_DIRS = new Set(['.git', '.next', 'node_modules', 'dist', 'coverage']);
const MARKER_PATTERN = /@e2e-cell feature=(\S+) kind=(\S+)/;

const markers = findMarkerFiles(MARKER_ROOTS)
  .flatMap(readMarkers)
  .map((marker) => ({ ...marker, kind: marker.kind.replace(/[*\/\s]+$/, '') }));
const TAG_TO_KIND = { '@middleware:': 'middleware', '@authBoundary:': 'auth-boundary' };
const coverage = new Set();
const specs = existsSync('e2e') ? readdirSync('e2e').filter(n => n.endsWith('.spec.ts')) : [];
for (const f of specs) {
  const feature = f.replace(/\.spec\.ts$/, '');
  const text = readFileSync(`e2e/${f}`, 'utf8');
  if (/\btest\s*\(/.test(text)) coverage.add(`${feature}|route`);
  for (const [prefix, kind] of Object.entries(TAG_TO_KIND))
    if (text.includes(prefix)) coverage.add(`${feature}|${kind}`);
}
const orphans = markers.filter(m => !coverage.has(`${m.feature}|${m.kind}`));
mkdirSync('.e2e', { recursive: true });
writeFileSync('.e2e/orphans.json', JSON.stringify(orphans, null, 2));
if (orphans.length) { console.error(`E2E orphans: ${orphans.length}`); process.exit(1); }

function findMarkerFiles(rootPatterns) {
  return rootPatterns
    .split(/\s+/)
    .filter(Boolean)
    .flatMap(expandRootPattern)
    .flatMap(walkFiles);
}

function expandRootPattern(pattern) {
  return pattern
    .split(/[\\/]+/)
    .reduce((paths, segment) => {
      if (segment === '*') {
        return paths.flatMap((base) => listChildDirectories(base));
      }

      return paths
        .map((base) => join(base, segment))
        .filter((candidate) => existsSync(candidate));
    }, ['.']);
}

function listChildDirectories(base) {
  if (!existsSync(base)) return [];

  return readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(base, entry.name));
}

function walkFiles(root) {
  if (!existsSync(root)) return [];

  const stat = statSync(root);
  if (stat.isFile()) return [root];
  if (!stat.isDirectory()) return [];

  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && SKIPPED_DIRS.has(entry.name)) return [];
    return walkFiles(join(root, entry.name));
  });
}

function readMarkers(file) {
  const text = readFileSync(file, 'utf8');
  return text.split(/\r?\n/).flatMap((lineText, index) => {
    const match = MARKER_PATTERN.exec(lineText);
    if (!match) return [];

    const [, feature, kind] = match;
    return [{
      file: relative('.', file).replaceAll('\\', '/'),
      line: index + 1,
      feature,
      kind,
    }];
  });
}
