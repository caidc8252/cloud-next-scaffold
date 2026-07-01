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

test('folds composition members into their root (absorbed), leaving one emittable per cluster', () => {
  const entry = (over: object) => ({ contract: 'x', primary: null, children: [], named: [], kind: 'export' as const, disposition: 'clean-export' as const, missing: [], ...over })
  const t: ResolvedTable = {
    foundationVersion: 't',
    byClass: {
      'step-indicator': entry({ primary: 'step-indicator', children: ['step'], named: ['StepIndicator'] }),
      step: entry({ primary: 'step-indicator', children: ['step'], named: ['StepIndicator'] }),
      field: entry({ primary: 'field', children: [], named: ['Field'] }),
      label: entry({ primary: 'label', children: [], named: ['Label'] }),
      input: entry({ primary: 'input', children: [], named: ['Input'] }),
    },
  }
  const src = [
    '<ol class="step-indicator">',
    '  <li class="step"><span class="step__dot">1</span></li>',
    '  <li class="step"><span class="step__dot">2</span></li>',
    '</ol>',
    '<div class="field">',
    '  <label class="label">Name</label>',
    '  <input class="input">',
    '  <p class="field__hint">hint</p>',
    '</div>',
  ].join('\n')
  const nodes = parseArtifactBody(src, 1, t)
  const bucketOf = (cls: string) => nodes.find((n) => n.classes.includes(cls))!.bucket
  // one emittable root per composition; every member folds in
  expect(bucketOf('step-indicator')).toBe('clean-mapped')
  expect(nodes.filter((n) => n.classes.includes('step')).every((n) => n.bucket === 'absorbed')).toBe(true)
  expect(nodes.filter((n) => n.classes.includes('step__dot')).every((n) => n.bucket === 'absorbed')).toBe(true)
  expect(bucketOf('field')).toBe('clean-mapped')
  expect(bucketOf('label')).toBe('absorbed')        // <Field label=…> renders Label internally (SLOT_AUGMENT)
  expect(bucketOf('field__hint')).toBe('absorbed')  // same BEM block as field
  expect(bucketOf('input')).toBe('clean-mapped')     // a rendered child of Field, not a member
  const emittable = nodes.filter((n) => n.bucket === 'clean-mapped' || n.bucket === 'html-decompose')
  expect(emittable.map((n) => n.component).sort()).toEqual(['Field', 'Input', 'StepIndicator'])
})
