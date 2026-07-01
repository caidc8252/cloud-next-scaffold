import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyEdits, modify, parse } from 'jsonc-parser';

export type JsonPatchResult =
  | { kind: 'patched'; detail: string }
  | { kind: 'noop'; reason: string }
  | { kind: 'conflict'; key: string; existing: unknown; desired: unknown };

export function addPackageScript(rootDir: string, name: string, command: string): JsonPatchResult {
  const file = join(rootDir, 'package.json');
  let text = readFileSync(file, 'utf8');
  const parsed = parse(text) as { scripts?: Record<string, string> };
  const existing = parsed.scripts?.[name];

  if (existing !== undefined) {
    if (existing === command) return { kind: 'noop', reason: `${name} already set` };
    return { kind: 'conflict', key: name, existing, desired: command };
  }

  const edits = modify(text, ['scripts', name], command, {
    formattingOptions: { tabSize: 2, insertSpaces: true },
  });
  text = applyEdits(text, edits);
  writeFileSync(file, text);
  return { kind: 'patched', detail: `added scripts.${name}` };
}

// Never conflicts: an existing declaration is a noop, so the return omits the
// `conflict` variant that addPackageScript can produce.
export function addDevDependency(
  rootDir: string,
  name: string,
  range: string,
): { kind: 'patched'; detail: string } | { kind: 'noop'; reason: string } {
  const file = join(rootDir, 'package.json');
  let text = readFileSync(file, 'utf8');
  const parsed = parse(text) as { devDependencies?: Record<string, string>; dependencies?: Record<string, string> };
  // Respect an existing declaration in either bucket — never override a consumer's pin.
  const existing = parsed.devDependencies?.[name] ?? parsed.dependencies?.[name];
  if (existing !== undefined) return { kind: 'noop', reason: `${name} already declared (${existing})` };

  const edits = modify(text, ['devDependencies', name], range, {
    formattingOptions: { tabSize: 2, insertSpaces: true },
  });
  text = applyEdits(text, edits);
  writeFileSync(file, text);
  return { kind: 'patched', detail: `added devDependencies.${name}@${range}` };
}

// Like addPackageScript, but OVERWRITES a drifted value instead of reporting a conflict —
// kit-owned script chains are reset to desired on every run.
export function setPackageScript(rootDir: string, name: string, command: string): JsonPatchResult {
  const file = join(rootDir, 'package.json');
  let text = readFileSync(file, 'utf8');
  const parsed = parse(text) as { scripts?: Record<string, string> };
  const existing = parsed.scripts?.[name];
  if (existing === command) return { kind: 'noop', reason: `${name} already set` };
  const edits = modify(text, ['scripts', name], command, {
    formattingOptions: { tabSize: 2, insertSpaces: true },
  });
  text = applyEdits(text, edits);
  writeFileSync(file, text);
  return { kind: 'patched', detail: existing === undefined ? `added scripts.${name}` : `reset scripts.${name}` };
}

export function appendGitignore(rootDir: string, entries: string[]): JsonPatchResult {
  const file = join(rootDir, '.gitignore');
  const current = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const present = new Set(current.split('\n').map(l => l.trim()).filter(Boolean));
  const toAdd = entries.filter(e => !present.has(e.trim()));
  if (toAdd.length === 0) return { kind: 'noop', reason: 'all entries present' };

  const prefix = current.length === 0 || current.endsWith('\n') ? '' : '\n';
  writeFileSync(file, current + prefix + toAdd.join('\n') + '\n');
  return { kind: 'patched', detail: `appended ${toAdd.length} .gitignore entries` };
}
