import { disposition } from '../src/cross-check'
import { buildContractTable } from '../src/build-table'
import { join } from 'node:path'

const exports = new Set(['Button', 'Card', 'RadioGroupItem', 'Alert', 'AlertTitle', 'AlertDescription'])

test('disposition: single existing export -> clean-export', () => {
  expect(disposition({ contract: 'button', primary: 'btn', children: [], named: ['Button'], kind: 'export' }, exports))
    .toEqual({ disposition: 'clean-export', missing: [] })
})

test('disposition: composition whose parts all exist -> clean-composition', () => {
  expect(disposition({ contract: 'option-card', primary: 'option-card', children: [], named: ['Card', 'RadioGroupItem'], kind: 'composition' }, exports).disposition)
    .toBe('clean-composition')
})

test('disposition: named import with no export -> unimplemented', () => {
  expect(disposition({ contract: 'dropzone', primary: 'dropzone', children: [], named: ['Dropzone'], kind: 'export' }, exports))
    .toEqual({ disposition: 'unimplemented', missing: ['Dropzone'] })
})

test('disposition: html kind -> html-decompose', () => {
  expect(disposition({ contract: 'kv-grid', primary: 'kv-grid', children: [], named: [], kind: 'html' }, exports).disposition)
    .toBe('html-decompose')
})

test('buildContractTable maps owned classes to contract entries with foundationVersion', () => {
  const table = buildContractTable([join(__dirname, 'fixtures/contracts')], 'v0.3.0-test')
  expect(table.foundationVersion).toBe('v0.3.0-test')
  expect(table.contractHashes).toEqual({})
  expect(table.byClass['btn']!.kind).toBe('export')
  expect(table.byClass['btn']!.named).toContain('Button')
  expect(table.byClass['option-card']!.kind).toBe('composition')
  expect(table.byClass['option-card']!.named).toContain('Card')
})
