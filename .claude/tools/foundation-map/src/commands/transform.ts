import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { DEFAULT_TABLES_DIR, DEFAULT_UI_SRC } from '../paths'
import { loadTable } from '../load-table'
import { resolveDispositions } from '../resolve'
import { loadExports } from '../cross-check'
import { detectRegions } from '../regions'
import { parseArtifactBody } from '../parse-artifact'
import { emitTsx } from '../emit-tsx'
import { runGate } from '../gate'
import { analyzeBehavior } from '../behavior-report'
import { buildResidueReport } from '../residue'

const UI_SRC = process.env.UI_SRC_DIR ?? DEFAULT_UI_SRC

function bannerVersion(html: string): string {
  const m = html.match(/<!--\s*foundation:\s*([^\s]+)/)
  return m ? m[1]! : 'unknown'
}

function componentName(artifactPath: string): string {
  const base = basename(artifactPath).replace(/\.html?$/i, '')
  const camel = base.replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
  const cleaned = camel.replace(/[^a-zA-Z0-9]/g, '')
  const titled = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  return /^[A-Za-z]/.test(titled) ? titled : `Feature${titled}`
}

export function transformCmd(
  artifactPath: string,
  opts: { tablesDir?: string; uiSrcDir?: string; outDir?: string } = {},
): number {
  const tablesDir = opts.tablesDir ?? DEFAULT_TABLES_DIR
  const uiSrcDir = opts.uiSrcDir ?? UI_SRC
  const outDir = opts.outDir ?? join(process.cwd(), 'out')

  const html = readFileSync(artifactPath, 'utf8')
  const lines = html.split('\n')
  const version = bannerVersion(html)

  // Version-match precondition — throws if no checked-in table for this version.
  let contractTable
  try {
    contractTable = loadTable(version, tablesDir)
  } catch (e) {
    console.error((e as Error).message)
    return 1
  }
  // Consume-time cross-check against the real @cloud/ui exports.
  const table = resolveDispositions(contractTable, loadExports(uiSrcDir))

  const r = detectRegions(html)
  const body = lines.slice(r.bodyStart - 1, r.bodyEnd).join('\n')
  const nodes = parseArtifactBody(body, r.bodyStart, table)
  const name = componentName(artifactPath)
  const tsx = emitTsx(nodes, name)
  const gate = runGate(nodes, tsx)

  const script = r.scriptStart > 0 ? lines.slice(r.scriptStart - 1, r.scriptEnd).join('\n') : ''
  const behavior = analyzeBehavior(script, r.scriptStart || 1)

  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'table.json'), JSON.stringify(table, null, 2))
  writeFileSync(join(outDir, `${name}.tsx`), tsx)
  writeFileSync(join(outDir, 'gate.json'), JSON.stringify(gate, null, 2))
  writeFileSync(join(outDir, 'behavior.json'), JSON.stringify(behavior, null, 2))
  writeFileSync(join(outDir, 'residue.json'), JSON.stringify(buildResidueReport(nodes, version), null, 2))

  const rt = gate.roundTrip
  console.log(`foundation: ${version}  component: ${name}  nodes: ${gate.total}`)
  console.log(`buckets: ${JSON.stringify(gate.buckets)}`)
  console.log(`scaffold round-trip: matched ${rt.matchedInstances}/${rt.onContractNodes}  orphan ${rt.orphanInstances}  unmatched ${rt.unmatchedNodes}  reliable=${rt.reliable}`)
  console.log(`behavior: custom ${behavior.customLoc}/${behavior.totalLoc} LOC (${Math.round(behavior.customFraction * 100)}% custom)`)
  const res = buildResidueReport(nodes, version)
  console.log(`residue: layout ${res.layoutResidue.length} (silent) · unimplemented ${res.unimplemented.length} (flag) · unknown ${res.offContractUnknown.length} (flag)`)
  return rt.reliable ? 0 : 1
}
