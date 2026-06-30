import ts from 'typescript';

const SENTINEL_PREFIX = '// next-kit:eslint-restricted-imports';
export const CURRENT_VERSION = 15;
// First version installed as a clean `...nextKitGuardrail()` spread. Such installs
// are machine-removable, so an older one can be upgraded IN PLACE (bump the sentinel;
// the command re-copies the preset, which is what delivers the new rule set). v3 and
// earlier were hand-written blocks → not machine-removable → manual delete + reinstall.
const FIRST_SPREAD_VERSION = 4;

export type SpliceParams = {
  appApi?: string[];
  packages?: string;
  packagesDb?: string;
  packagesI18n?: string;
  packagesSecurity?: string;
  packagesCache?: string;
};

export type SpliceResult =
  | { kind: 'patched'; text: string }
  | { kind: 'upgrade'; text: string; from: number }
  | { kind: 'noop'; reason: string }
  | { kind: 'manual'; reason: string; instructions: string };

export function detectSentinel(text: string): { version: number } | null {
  const m = text.match(/\/\/ next-kit:eslint-restricted-imports v(\d+)/);
  return m ? { version: Number(m[1]) } : null;
}

function renderParams(p: SpliceParams): string {
  const parts: string[] = [];
  if (p.appApi) parts.push(`appApi: ${JSON.stringify(p.appApi)}`);
  if (p.packages && p.packages !== 'packages/**') parts.push(`packages: ${JSON.stringify(p.packages)}`);
  return parts.length ? `{ ${parts.join(', ')} }` : '';
}

function isRecognizedHelper(callee: ts.Expression): boolean {
  if (ts.isIdentifier(callee) && callee.text === 'defineConfig') return true;
  if (ts.isPropertyAccessExpression(callee) && callee.name.text === 'config') return true; // tseslint.config(...)
  return false;
}

type Target =
  | { kind: 'array'; node: ts.ArrayLiteralExpression }
  | { kind: 'callArg'; node: ts.CallExpression };

function classify(expr: ts.Expression): Target | null {
  if (ts.isArrayLiteralExpression(expr)) return { kind: 'array', node: expr };
  if (ts.isCallExpression(expr) && isRecognizedHelper(expr.expression)) {
    const arrArg = expr.arguments.find(ts.isArrayLiteralExpression);
    if (arrArg) return { kind: 'array', node: arrArg };
    return { kind: 'callArg', node: expr };
  }
  return null;
}

function findTarget(sf: ts.SourceFile): Target | null {
  let found: Target | null = null;
  sf.forEachChild(node => {
    if (found) return;
    if (ts.isExportAssignment(node) && !node.isExportEquals) {
      found = classify(node.expression);
    } else if (
      ts.isExpressionStatement(node) &&
      ts.isBinaryExpression(node.expression) &&
      node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      const lhs = node.expression.left;
      if (ts.isPropertyAccessExpression(lhs) && lhs.expression.getText(sf) === 'module' && lhs.name.text === 'exports') {
        found = classify(node.expression.right);
      }
    }
  });
  return found;
}

function lastImportEnd(sf: ts.SourceFile): number {
  let end = 0;
  sf.statements.forEach(s => {
    if (ts.isImportDeclaration(s)) end = s.getEnd();
    else if (ts.isVariableStatement(s) && /\brequire\s*\(/.test(s.getText(sf))) end = s.getEnd();
  });
  return end;
}

export function spliceGuardrail(text: string, params: SpliceParams, fileName: string): SpliceResult {
  const sentinel = detectSentinel(text);
  if (sentinel) {
    if (sentinel.version === CURRENT_VERSION) return { kind: 'noop', reason: `already at v${CURRENT_VERSION}` };
    if (sentinel.version > CURRENT_VERSION) {
      return { kind: 'manual', reason: `newer kit (v${sentinel.version})`, instructions: 'Consumer is on a newer kit; do not downgrade.' };
    }
    // Older install. A clean v4+ spread install is machine-removable: upgrade in
    // place by bumping the sentinel and letting the command re-copy the preset.
    if (sentinel.version >= FIRST_SPREAD_VERSION) {
      const bumped = text.replace(/(\/\/ next-kit:eslint-restricted-imports v)\d+/, `$1${CURRENT_VERSION}`);
      return { kind: 'upgrade', text: bumped, from: sentinel.version };
    }
    return {
      kind: 'manual',
      reason: `v${sentinel.version} hand-written install detected`,
      instructions:
        `Delete the kit-owned blocks: from the line "${SENTINEL_PREFIX} v${sentinel.version}" ` +
        `through the end of the spliced guardrail, then re-run bin/setup eslint for a clean ` +
        `v${CURRENT_VERSION} install. v3 blocks were hand-written and are not machine-removable.`,
    };
  }

  const isCjs = fileName.endsWith('.cjs');
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const target = findTarget(sf);
  const sentinelComment = `${SENTINEL_PREFIX} v${CURRENT_VERSION}`;
  const call = `nextKitGuardrail(${renderParams(params)})`;

  if (!target) {
    return {
      kind: 'manual',
      reason: 'could not locate a recognized default-export config array/helper',
      instructions:
        `Add the import for nextKitGuardrail from './eslint.nextkit.mjs', then add ` +
        `\`...${call}\` as the LAST element of the exported flat-config array, ` +
        `preceded by the comment "${sentinelComment}".`,
    };
  }

  let out: string;
  if (target.kind === 'array') {
    const closeBracket = target.node.getEnd() - 1; // position of ']'
    const insert = `  ${sentinelComment}\n  ...${call},\n`;
    out = text.slice(0, closeBracket) + insert + text.slice(closeBracket);
  } else {
    const args = target.node.arguments;
    const insertPos = args.length > 0 ? args[args.length - 1]!.getEnd() : target.node.getEnd() - 1;
    const lead = args.length > 0 ? ',' : '';
    const insert = `${lead}\n  ${sentinelComment}\n  ...${call}`;
    out = text.slice(0, insertPos) + insert + text.slice(insertPos);
  }

  // Insert the import after the last existing import/require (or at top). This
  // offset is computed on the ORIGINAL text; the export-array/call edit above
  // is at a HIGHER offset, so it does not shift this position.
  const importLine = isCjs
    ? `const { nextKitGuardrail } = require('./eslint.nextkit.mjs');`
    : `import { nextKitGuardrail } from './eslint.nextkit.mjs';`;
  const importPos = lastImportEnd(sf);
  out = importPos === 0
    ? `${importLine}\n${out}`
    : `${out.slice(0, importPos)}\n${importLine}${out.slice(importPos)}`;

  return { kind: 'patched', text: out };
}
