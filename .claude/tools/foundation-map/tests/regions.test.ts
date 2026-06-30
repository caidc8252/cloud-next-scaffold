import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { detectRegions } from '../src/regions'

const html = readFileSync(join(__dirname, 'fixtures', 'regions-sample.html'), 'utf8')

describe('detectRegions', () => {
  it('finds the body markup region (after <body>, before the inline <script>)', () => {
    const r = detectRegions(html)
    // <body> is line 5; markup starts line 6; inline <script> opens line 8.
    expect(r.bodyStart).toBe(6)
    expect(r.bodyEnd).toBe(7)
  })
  it('finds the inline <script> region, ignoring src= scripts', () => {
    const r = detectRegions(html)
    // inline <script> opens line 8; body starts line 9; </script> is line 11.
    expect(r.scriptStart).toBe(9)
    expect(r.scriptEnd).toBe(10)
  })
  it('returns 0/0 for script bounds when there is no inline script', () => {
    const r = detectRegions('<body>\n<div class="btn"></div>\n</body>')
    expect(r.scriptStart).toBe(0)
    expect(r.scriptEnd).toBe(0)
    expect(r.bodyStart).toBe(2)
    expect(r.bodyEnd).toBe(2)
  })
})
