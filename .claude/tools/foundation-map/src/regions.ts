export interface Regions {
  bodyStart: number   // 1-indexed inclusive
  bodyEnd: number     // 1-indexed inclusive
  scriptStart: number // 0 when no inline script
  scriptEnd: number   // 0 when no inline script
}

// Deterministic line scanner. Foundation artifacts ship a single inline <script>
// (the behavior) inside <body>; markup is everything in <body> before it.
export function detectRegions(html: string): Regions {
  const lines = html.split('\n')
  const find = (re: RegExp, from = 0): number => {
    for (let i = from; i < lines.length; i++) if (re.test(lines[i]!)) return i // 0-indexed
    return -1
  }
  const bodyOpen = find(/<body[\s>]/i)
  const bodyClose = find(/<\/body>/i, bodyOpen + 1)
  // Inline <script> = a <script> tag with NO src= attribute.
  let scriptOpen = -1
  for (let i = (bodyOpen >= 0 ? bodyOpen : 0); i < lines.length; i++) {
    if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(lines[i]!)) { scriptOpen = i; break }
  }
  const scriptClose = scriptOpen >= 0 ? find(/<\/script>/i, scriptOpen + 1) : -1

  const bodyStart = (bodyOpen >= 0 ? bodyOpen : 0) + 2 // line after <body> (1-indexed)
  const hasInline = scriptOpen >= 0 && scriptClose > scriptOpen
  const bodyEndExclusive0 =
    hasInline && (bodyClose < 0 || scriptOpen < bodyClose) ? scriptOpen : (bodyClose >= 0 ? bodyClose : lines.length)
  const bodyEnd = bodyEndExclusive0 // 1-indexed inclusive end = 0-indexed line before the boundary + 1

  return {
    bodyStart,
    bodyEnd,
    scriptStart: hasInline ? scriptOpen + 2 : 0,
    scriptEnd: hasInline ? scriptClose : 0,
  }
}
