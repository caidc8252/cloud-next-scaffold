import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildContractTable } from '../src/build-table'
import { resolveDispositions } from '../src/resolve'
import { detectRegions } from '../src/regions'
import { parseArtifactBody } from '../src/parse-artifact'
import { emitTsx } from '../src/emit-tsx'

const GOLD = join(__dirname, 'fixtures', 'golden')
// Fixed export set: Button + the OptionCard composition exist; the Select
// cluster is contracted-but-unimplemented (drift, §4e). kv-grid is html-decompose.
const EXPORTS = new Set(['Button', 'Card', 'RadioGroupItem'])

function transformReference(): string {
  const table = resolveDispositions(
    buildContractTable([join(GOLD, 'contracts')], 'vGOLD'),
    EXPORTS,
  )
  const html = readFileSync(join(GOLD, 'reference.html'), 'utf8')
  const r = detectRegions(html)
  const body = html.split('\n').slice(r.bodyStart - 1, r.bodyEnd).join('\n')
  const nodes = parseArtifactBody(body, r.bodyStart, table)
  return emitTsx(nodes, 'Golden')
}

describe('golden pair', () => {
  it('transforming the reference reproduces the golden TSX', () => {
    const goldenPath = join(GOLD, 'reference.tsx')
    const actual = transformReference()
    if (!existsSync(goldenPath)) {
      writeFileSync(goldenPath, actual) // first run authors the golden; review the diff before committing
      throw new Error('golden authored — inspect reference.tsx, then re-run')
    }
    expect(actual).toBe(readFileSync(goldenPath, 'utf8'))
  })
})
