import type { ContractEntry, ContractKind } from './types'

function implementationsSection(md: string): { next: string; artifact: string } | null {
  const m = md.match(/## Implementations([\s\S]*?)(?:\n## |\s*$)/)
  if (!m) return null
  const sec = m[1]!
  const nextM = sec.match(/\*\*Next ?\/ ?@cloud\/ui\*\*[^\n]*(?:\n(?!\s*-).*)*/)
  const artM = sec.match(/\*\*Artifact[^\n]*(?:\n(?!\s*-).*)*/)
  return { next: nextM ? nextM[0] : '', artifact: artM ? artM[0] : '' }
}

const baseOf = (cls: string): string => cls.split(/__|--/)[0]!

// The Artifact prose references source filenames (`tokens.inline.css`,
// `rich-pagination.md`, `icon.mjs`) whose extension/segment dots the class
// regex would otherwise scrape as phantom classes (`css`, `inline`, `md`).
// Strip whole filename tokens (a name base ending in a known extension) first,
// so real compound selectors like `table.data-table` / `.btn.btn--secondary`
// — which have no extension — survive untouched.
const FILENAME = /[\w][\w.-]*\.(?:css|scss|md|mjs|js|jsx|ts|tsx|json|html)\b/g

export function parseContract(md: string, contractName: string): ContractEntry | null {
  const impl = implementationsSection(md)
  if (!impl) return null
  const { next, artifact } = impl

  const scannable = artifact.replace(FILENAME, '')
  const allClasses = [...scannable.matchAll(/\.([a-z][a-z0-9]+(?:-[a-z0-9]+)*)/g)].map((m) => baseOf(m[1]!))
  const primary = allClasses.length > 0 ? allClasses[0]! : null
  const children = allClasses.slice(1)

  // Named @cloud/ui imports: prefer `import { ... } from "@cloud/ui"`, else backticked Capitalized.
  const imports: string[] = []
  for (const m of next.matchAll(/import \{([^}]*)\} from "@cloud\/ui"/g)) {
    for (const tok of m[1]!.split(',')) { const t = tok.trim(); if (t) imports.push(t) }
  }
  const bare = [...next.matchAll(/`([A-Z][A-Za-z0-9]+)/g)].map((m) => m[1]!)
  const named = (imports.length > 0 ? imports : bare)
    .filter((n) => /^[A-Z]/.test(n))
    .map((n) => n.replace(/<.*/, ''))

  const namesRawHtml = named.length === 0 && /`<[a-z]+>`/.test(next)
  let kind: ContractKind
  if (named.length === 1) kind = 'export'
  else if (named.length > 1) kind = 'composition'
  else if (namesRawHtml) kind = 'html'
  else kind = 'unknown'

  return { contract: contractName, primary, children, named, kind }
}

export function assignOwnership(entries: ContractEntry[]): Map<string, ContractEntry> {
  const owned = new Map<string, ContractEntry>()
  const primaries = new Set(entries.map((e) => e.primary).filter((p): p is string => !!p))
  // Pass 1: every contract's primary (subject) class.
  for (const e of entries) {
    if (e.primary && !owned.has(e.primary)) owned.set(e.primary, e)
    if (!owned.has(e.contract)) owned.set(e.contract, e)
  }
  // Pass 2: attach child blocks only if no other contract claims them as primary.
  for (const e of entries) {
    for (const c of e.children) {
      if (!primaries.has(c) && !owned.has(c)) owned.set(c, e)
    }
  }
  return owned
}
