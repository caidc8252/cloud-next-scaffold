import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

// Drift manifest: relative-path -> sha256 of the contract source. Relative path
// is "<dir-basename>/<file>" so primitives/ and composites/ never collide.
export function hashContracts(contractsDirs: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const dir of contractsDirs) {
    const label = basename(dir)
    for (const f of readdirSync(dir).sort()) {
      if (!f.endsWith('.md')) continue
      const buf = readFileSync(join(dir, f))
      out[`${label}/${f}`] = createHash('sha256').update(buf).digest('hex')
    }
  }
  return out
}
