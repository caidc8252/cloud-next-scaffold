#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
const grep = (pat, dirs) => { try { return execSync(`grep -rEsn '${pat}' ${dirs}`, { encoding: 'utf8' }); } catch (e) { return e.stdout ?? ''; } };
const MARKER_ROOTS = process.env.E2E_MARKER_ROOTS || 'src app middleware.ts';
const markers = [...grep('@e2e-cell feature=\\S+ kind=\\S+', MARKER_ROOTS)
  .matchAll(/^(.+?):(\d+):.*@e2e-cell feature=(\S+) kind=(\S+)/gm)]
  .map(([, file, line, feature, kind]) => ({ file, line: +line, feature, kind: kind.replace(/[*\/\s]+$/, '') }));
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
