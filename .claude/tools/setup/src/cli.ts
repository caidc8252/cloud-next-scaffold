#!/usr/bin/env node
import type { SetupSummary } from './types.ts';

const USAGE = `Usage:
  setup eslint   [--dry-run]
  setup e2e      [--dry-run] [--verify]
  setup coverage [--dry-run]

Flags:
  --dry-run    plan and print without writing
  --verify     check preconditions + run e2e/_smoke.spec.ts (e2e only, opt-in)
  --help, -h   show this help
`;

function parseFlags(argv: string[]): { rest: string[]; dryRun: boolean; verify: boolean } {
  const rest: string[] = [];
  let dryRun = false, verify = false;
  for (const arg of argv) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg === '--verify') verify = true;
    else rest.push(arg);
  }
  return { rest, dryRun, verify };
}

function printSummary(s: SetupSummary, dryRun: boolean): void {
  const verb = dryRun ? 'Would write' : 'Wrote';
  console.log(`${verb} ${s.filesWritten.length} files${dryRun ? ' (dry-run)' : ''}`);
  for (const p of s.patches) console.log(`Patched: ${p.file} (${p.status} — ${p.detail})`);
  console.log(`Next: ${s.verifyHint}`);
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === '-h' || argv[0] === '--help') {
    console.log(USAGE);
    return 0;
  }
  const [verb, ...rawRest] = argv;
  const { dryRun, verify } = parseFlags(rawRest);
  const rootDir = process.cwd();

  try {
    if (verb === 'eslint') {
      const { setupEslint } = await import('./commands/eslint.ts');
      printSummary(await setupEslint({ rootDir, dryRun }), dryRun);
      return 0;
    }
    if (verb === 'e2e') {
      const { setupE2e } = await import('./commands/e2e.ts');
      printSummary(await setupE2e({ rootDir, dryRun, verify }), dryRun);
      return 0;
    }
    if (verb === 'coverage') {
      const { setupCoverage } = await import('./commands/coverage.ts');
      printSummary(await setupCoverage({ rootDir, dryRun }), dryRun);
      return 0;
    }
    console.error(`Unknown subcommand: ${verb}\n${USAGE}`);
    return 1;
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    return 1;
  }
}

main().then(code => process.exit(code)).catch(err => {
  console.error(err);
  process.exit(2);
});
