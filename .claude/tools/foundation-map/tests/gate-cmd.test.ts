import { describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { transformCmd } from '../src/commands/transform'
import { gateCmd } from '../src/commands/gate'

const ARTIFACT = '/workspaces/test-data/app-publish.html'
const TABLES = join(__dirname, '..', 'tables')
const UI = '/workspaces/pep-webapp/packages/ui/src'
const run = existsSync(ARTIFACT) && existsSync(UI)

describe.runIf(run)('gateCmd on the scaffold TSX', () => {
  it('passes when the TSX preserves every data-src (the scaffold does)', () => {
    const out = mkdtempSync(join(tmpdir(), 'fmap-'))
    transformCmd(ARTIFACT, { tablesDir: TABLES, uiSrcDir: UI, outDir: out })
    const tsx = join(out, 'AppPublish.tsx')
    expect(gateCmd(ARTIFACT, tsx, { tablesDir: TABLES, uiSrcDir: UI, outDir: out })).toBe(0)
    const residue = JSON.parse(readFileSync(join(out, 'residue.json'), 'utf8'))
    expect(residue.unimplemented.length).toBeGreaterThan(0) // app-publish exercises the §4e bucket
  })

  it('fails when a mapped instance is dropped from the final TSX', () => {
    const out = mkdtempSync(join(tmpdir(), 'fmap-'))
    transformCmd(ARTIFACT, { tablesDir: TABLES, uiSrcDir: UI, outDir: out })
    const tsxPath = join(out, 'AppPublish.tsx')
    const broken = readFileSync(tsxPath, 'utf8').replace(/<[A-Z][A-Za-z0-9]* data-src=\{\d+\} \/>/, '')
    const brokenPath = join(out, 'Broken.tsx')
    writeFileSync(brokenPath, broken)
    expect(gateCmd(ARTIFACT, brokenPath, { tablesDir: TABLES, uiSrcDir: UI, outDir: out })).toBe(1)
  })
})
