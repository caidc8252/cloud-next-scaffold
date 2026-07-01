import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArtifactBody } from '../src/parse-artifact'
import type { ResolvedTable } from '../src/types'

const table: ResolvedTable = {
  foundationVersion: 'test',
  byClass: {
    card: { contract: 'card', primary: 'card', children: [], named: ['Card'], kind: 'export', disposition: 'clean-export', missing: [] },
    btn: { contract: 'button', primary: 'btn', children: [], named: ['Button'], kind: 'export', disposition: 'clean-export', missing: [] },
    'option-card': { contract: 'option-card', primary: 'option-card', children: [], named: ['Card', 'RadioGroupItem'], kind: 'composition', disposition: 'clean-composition', missing: [] },
    dropzone: { contract: 'dropzone', primary: 'dropzone', children: [], named: ['Dropzone'], kind: 'export', disposition: 'unimplemented', missing: ['Dropzone'] },
  },
}
const html = readFileSync(join(__dirname, 'fixtures/mini-artifact.html'), 'utf8')

test('assigns stable ordinals in document order', () => {
  const nodes = parseArtifactBody(html, 1, table)
  expect(nodes.map((n) => n.id)).toEqual([...nodes.keys()])
})

test('buckets nodes: clean / unimplemented / layout / unknown', () => {
  const nodes = parseArtifactBody(html, 1, table)
  const byTag = Object.fromEntries(nodes.map((n) => [n.bases.join('+') || n.tag, n.bucket]))
  expect(byTag['card']).toBe('clean-mapped')
  expect(byTag['btn']).toBe('clean-mapped')
  expect(byTag['option-card']).toBe('clean-mapped')
  expect(byTag['dropzone']).toBe('unimplemented')
  expect(byTag['wizard-footer']).toBe('layout-residue')
  expect(byTag['totally-bespoke']).toBe('offcontract-unknown')
})

test('clean-mapped node records its target component', () => {
  const nodes = parseArtifactBody(html, 1, table)
  expect(nodes.find((n) => n.bases.includes('btn'))!.component).toBe('Button')
})
