import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { analyzeBehavior } from '../src/behavior-report'

const script = readFileSync(join(__dirname, 'fixtures/mini-script.js'), 'utf8')

test('splits top-level functions and counts their LOC', () => {
  const r = analyzeBehavior(script, 1)
  expect(r.units.map((u) => u.name).sort()).toEqual(['finishScan', 'metadataValid', 'updatePanels'])
  expect(r.units.find((u) => u.name === 'updatePanels')!.loc).toBe(4)
})

test('classifies panel-switching as absorbed and validation/sim as custom', () => {
  const r = analyzeBehavior(script, 1)
  const kind = Object.fromEntries(r.units.map((u) => [u.name, u.kind]))
  expect(kind['updatePanels']).toBe('absorbed')
  expect(kind['metadataValid']).toBe('custom')
  expect(kind['finishScan']).toBe('custom')
})

test('reports a custom fraction', () => {
  const r = analyzeBehavior(script, 1)
  expect(r.customFraction).toBeGreaterThan(0.5)
  expect(r.absorbedLoc + r.customLoc).toBe(r.totalLoc)
})
