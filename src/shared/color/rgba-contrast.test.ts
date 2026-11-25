import { describe, expect, it } from 'vitest'
import { hexToRgba } from './rgba-contrast'

describe('hexToRgba', () => {
  it('reads six- and three-digit hex at the given alpha', () => {
    expect(hexToRgba('#22c55e', 0.12)).toBe('rgba(34, 197, 94, 0.12)')
    expect(hexToRgba('#fff', 1)).toBe('rgba(255, 255, 255, 1)')
  })
})
