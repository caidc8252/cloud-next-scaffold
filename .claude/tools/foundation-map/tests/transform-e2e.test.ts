import { describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { transformCmd } from '../src/commands/transform'

const ARTIFACT = '/workspaces/test-data/app-publish.html'
const TABLES = join(__dirname, '..', 'tables')
const UI = '/workspaces/pep-webapp/packages/ui/src'
const run = existsSync(ARTIFACT) && existsSync(UI)

describe.runIf(run)('transformCmd e2e (app-publish)', () => {
  it('loads the checked-in v0.3.0 table, resolves, and produces a reliable scaffold', () => {
    const out = mkdtempSync(join(tmpdir(), 'fmap-'))
    const code = transformCmd(ARTIFACT, { tablesDir: TABLES, uiSrcDir: UI, outDir: out })
    expect(code).toBe(0) // round-trip reliable by construction
    expect(existsSync(join(out, 'AppPublish.tsx'))).toBe(true)
  })
})

describe('transformCmd version-match precondition', () => {
  it('refuses an artifact whose banner version has no checked-in table', () => {
    const out = mkdtempSync(join(tmpdir(), 'fmap-'))
    const fake = join(out, 'fake.html')
    writeFileSync(fake, '<!-- foundation: v9.9.9 -->\n<body>\n<div class="btn"></div>\n</body>')
    const code = transformCmd(fake, { tablesDir: TABLES, uiSrcDir: UI, outDir: out })
    expect(code).toBe(1)
  })
})
