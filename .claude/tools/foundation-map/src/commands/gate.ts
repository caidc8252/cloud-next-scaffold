import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_TABLES_DIR } from '../paths'
import { loadTable } from '../load-table'
import { resolveDispositions } from '../resolve'
import { loadExports } from '../cross-check'
import { detectRegions } from '../regions'
import { parseArtifactBody } from '../parse-artifact'
import { runGate } from '../gate'
import { buildResidueReport } from '../residue'

const UI_SRC = process.env.UI_SRC_DIR ?? '/workspaces/pep-webapp/packages/ui/src'

function bannerVersion(html: string): string {
  const m = html.match(/<!--\s*foundation:\s*([^\s]+)/)
  return m ? m[1]! : 'unknown'
}

// Conformance gate (spec §4c): assert the FINAL builder-authored TSX covers every
// emittable source node by data-src. A firing guard, not a self-grading reviewer.
export function gateCmd(
  artifactPath: string,
  tsxPath: string,
  opts: { tablesDir?: string; uiSrcDir?: string; outDir?: string } = {},
): number {
  if (!artifactPath || !tsxPath) {
    console.error('usage: foundation-map gate <artifact.html> <final.tsx>')
    return 2
  }
  const tablesDir = opts.tablesDir ?? DEFAULT_TABLES_DIR
  const outDir = opts.outDir ?? join(process.cwd(), 'out')

  const html = readFileSync(artifactPath, 'utf8')
  const lines = html.split('\n')
  const version = bannerVersion(html)

  let contractTable
  try { contractTable = loadTable(version, tablesDir) }
  catch (e) { console.error((e as Error).message); return 1 }
  const table = resolveDispositions(contractTable, loadExports(opts.uiSrcDir ?? UI_SRC))

  const r = detectRegions(html)
  const body = lines.slice(r.bodyStart - 1, r.bodyEnd).join('\n')
  const nodes = parseArtifactBody(body, r.bodyStart, table)

  const tsx = readFileSync(tsxPath, 'utf8')
  const gate = runGate(nodes, tsx)
  const residue = buildResidueReport(nodes, version)

  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'gate.json'), JSON.stringify(gate, null, 2))
  writeFileSync(join(outDir, 'residue.json'), JSON.stringify(residue, null, 2))

  const rt = gate.roundTrip
  console.log(`gate ${version}: matched ${rt.matchedInstances}/${rt.onContractNodes}  orphan ${rt.orphanInstances}  unmatched ${rt.unmatchedNodes}`)
  console.log(`residue: layout ${residue.layoutResidue.length} (silent) · unimplemented ${residue.unimplemented.length} (flag) · unknown ${residue.offContractUnknown.length} (flag)`)
  if (!rt.reliable) {
    console.error('GATE FAILED: final TSX does not cover every on-contract source node (preserve data-src on mapped nodes)')
    return 1
  }
  console.log('GATE PASSED: coverage complete')
  return 0
}
