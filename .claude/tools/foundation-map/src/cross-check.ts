import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { ContractEntry, Disposition } from './types'

export function disposition(e: ContractEntry, exports: Set<string>): { disposition: Disposition; missing: string[] } {
  if (e.named.length > 0) {
    const missing = e.named.filter((n) => !exports.has(n))
    const present = e.named.filter((n) => exports.has(n))
    let d: Disposition
    if (missing.length === 0) d = e.named.length === 1 ? 'clean-export' : 'clean-composition'
    else if (present.length > 0) d = 'partial-drift'
    else d = 'unimplemented'
    return { disposition: d, missing }
  }
  if (e.kind === 'html') return { disposition: 'html-decompose', missing: [] }
  return { disposition: 'unimplemented', missing: [] } // composition described but no names resolvable
}

export function loadExports(uiSrcDir: string): Set<string> {
  const out = new Set<string>()
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) { walk(p); continue }
      if (!/\.tsx?$/.test(name)) continue
      const src = readFileSync(p, 'utf8')
      for (const m of src.matchAll(/export \{([^}]*)\}/g)) {
        for (const tok of m[1]!.split(',')) {
          const id = tok.trim().split(/\s+as\s+/).pop()!.trim()
          if (/^[A-Z][A-Za-z0-9]+$/.test(id)) out.add(id)
        }
      }
      for (const m of src.matchAll(/export (?:const|function|class|default function) ([A-Z][A-Za-z0-9]+)/g)) {
        out.add(m[1]!)
      }
    }
  }
  walk(uiSrcDir)
  return out
}
