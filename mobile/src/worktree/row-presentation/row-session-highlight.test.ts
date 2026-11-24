import { describe, expect, it } from 'vitest'
import { rowSessionHighlightStyle } from './row-session-highlight'

const FALLBACK = { working: '#3276f2', needsYou: '#eab308' }

describe('rowSessionHighlightStyle', () => {
  it("tints a working row with its machine's color and draws a rail", () => {
    expect(rowSessionHighlightStyle('working', '#22c55e', FALLBACK)).toEqual({
      backgroundColor: 'rgba(34, 197, 94, 0.12)',
      borderLeftColor: '#22c55e',
      borderLeftWidth: 3
    })
  })

  it('uses the accent for a working row when the machine has no color', () => {
    expect(rowSessionHighlightStyle('working', null, FALLBACK)?.borderLeftColor).toBe('#3276f2')
  })

  it('marks a needs-you row in amber whatever its machine', () => {
    expect(rowSessionHighlightStyle('needs-you', '#22c55e', FALLBACK)).toEqual({
      backgroundColor: 'rgba(234, 179, 8, 0.12)',
      borderLeftColor: '#eab308',
      borderLeftWidth: 3
    })
  })

  it('leaves quiet rows alone', () => {
    expect(rowSessionHighlightStyle(undefined, '#22c55e', FALLBACK)).toBeNull()
  })
})
