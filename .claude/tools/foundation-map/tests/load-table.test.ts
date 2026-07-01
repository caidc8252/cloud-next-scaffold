import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { loadTable } from '../src/load-table'

const TABLES = join(__dirname, '..', 'tables')

describe('loadTable', () => {
  it('loads and validates the checked-in table for a version', () => {
    const t = loadTable('v0.3.0', TABLES)
    expect(t.foundationVersion).toBe('v0.3.0')
    expect(t.byClass.btn).toBeDefined()
  })
  it('throws the version-match precondition error when no table exists', () => {
    expect(() => loadTable('v9.9.9', TABLES)).toThrow(/no checked-in table for foundation v9\.9\.9/)
  })
  it('throws when the table internal version does not match the requested version', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'load-table-test-'))
    const content = JSON.stringify({ foundationVersion: 'v9.9.9', contractHashes: {}, byClass: {} })
    writeFileSync(join(tmpDir, 'foundation-v0.0.0.json'), content, 'utf8')
    expect(() => loadTable('v0.0.0', tmpDir)).toThrow(/declares version v9\.9\.9/)
  })
})
