import { describe, expect, it } from 'vitest'
import { readHostAppearanceOverrides } from './host-appearance-overrides'

describe('readHostAppearanceOverrides', () => {
  it('reads each host’s color and tint from settings.get', () => {
    expect(
      readHostAppearanceOverrides({
        'ssh:m1': { displayLabel: 'M1', color: '#3b82f6', sectionTint: 'strong' },
        local: { color: 'none' }
      })
    ).toEqual([
      ['ssh:m1', { color: '#3b82f6', sectionTint: 'strong' }],
      ['local', { color: 'none' }]
    ])
  })

  it('reads an older desktop’s label-only overrides, and junk, as no appearance', () => {
    expect(readHostAppearanceOverrides({ 'ssh:m1': { displayLabel: 'M1' } })).toEqual([])
    expect(readHostAppearanceOverrides(undefined)).toEqual([])
    expect(
      readHostAppearanceOverrides({
        'not a host': { color: '#fff' },
        local: { color: 3, sectionTint: 'loud' }
      })
    ).toEqual([])
  })
})
