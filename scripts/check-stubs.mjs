#!/usr/bin/env node
// Hard gate for /submit-work: a *.stub.* is a temporary cross-module
// forward-declaration and must never reach develop. Lists any survivors and
// fails. Mirrors check-e2e-orphans.mjs (grep-based, exit code = gate).
import { execSync } from 'node:child_process';
const ROOT = process.env.STUB_ROOTS || 'apps/web';
let out = '';
try {
  // -l: list files; the glob covers .stub.ts/.tsx/.mts/.cts/.js/.jsx
  out = execSync(`git ls-files -- '${ROOT}/**/*.stub.*'`, { encoding: 'utf8' });
} catch (e) {
  out = e.stdout ?? '';
}
const stubs = out.split('\n').map(s => s.trim()).filter(Boolean);
if (stubs.length) {
  console.error(`stub-residue: ${stubs.length} unresolved *.stub.* file(s) — resolve (owner ships → swap import → delete) before PR to develop:`);
  for (const f of stubs) console.error(`  ${f}`);
  process.exit(1);
}
console.log('stub-residue: none.');
