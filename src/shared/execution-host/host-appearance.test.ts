import { describe, expect, it } from 'vitest'
import { DEFAULT_REPO_BADGE_COLOR, REPO_COLORS } from '../repository/appearance/repo-badge-color'
import type { ExecutionHostId } from './execution-host'
import {
  clearHostColor,
  HOST_COLOR_NONE,
  resolveHostColor,
  resolveHostSectionTint,
  setHostColor,
  setHostSectionTint
} from './host-appearance'

const order: ExecutionHostId[] = ['local', 'ssh:a', 'ssh:b', 'runtime:c']

describe('host appearance', () => {
  it('prefers the user color over the auto preset', () => {
    const settings = { hostSettingOverrides: { 'ssh:a': { color: '#ABCDEF' } } }
    expect(resolveHostColor(settings, 'ssh:a', order)).toBe('#abcdef')
  })

  it('gives the first hosts distinct auto colors that follow section order', () => {
    const colors = order.map((hostId) => resolveHostColor({}, hostId, order))
    expect(new Set(colors).size).toBe(order.length)
    expect(colors.every((color) => REPO_COLORS.some((preset) => preset === color))).toBe(true)
    expect(resolveHostColor({}, 'ssh:b', order)).toBe(resolveHostColor({}, 'ssh:b', [...order]))
  })

  it('resolves None to no color', () => {
    const settings = { hostSettingOverrides: { local: setHostColor({}, 'local', null).local } }
    expect(settings.hostSettingOverrides.local?.color).toBe(HOST_COLOR_NONE)
    expect(resolveHostColor(settings, 'local', order)).toBeNull()
  })

  it('ignores an invalid hex instead of storing or rendering it', () => {
    expect(setHostColor({}, 'local', 'not-a-color')).toEqual({})
    const stored = { hostSettingOverrides: { local: { color: '#zzz' } } }
    expect(resolveHostColor(stored, 'local', order)).toBe(resolveHostColor({}, 'local', order))
  })

  it('drops the color key and the empty host entry when cleared', () => {
    const settings = { hostSettingOverrides: setHostColor({}, 'ssh:a', '#22c55e') }
    expect(clearHostColor(settings, 'ssh:a')).toEqual({})
  })

  it('defaults the section tint to subtle and accepts only known tints', () => {
    expect(resolveHostSectionTint({}, 'local')).toBe('subtle')
    const settings = { hostSettingOverrides: setHostSectionTint({}, 'local', 'strong') }
    expect(resolveHostSectionTint(settings, 'local')).toBe('strong')
    // Persisted settings are untrusted JSON, so an unknown tint can reach the resolver.
    const bogus = { hostSettingOverrides: JSON.parse('{"local":{"sectionTint":"loud"}}') }
    expect(resolveHostSectionTint(bogus, 'local')).toBe('subtle')
  })

  it('stores no key for the default subtle tint', () => {
    const strong = { hostSettingOverrides: setHostSectionTint({}, 'local', 'strong') }
    expect(setHostSectionTint(strong, 'local', 'subtle')).toEqual({})
    const colored = {
      hostSettingOverrides: { local: { color: '#22c55e', sectionTint: 'off' as const } }
    }
    expect(setHostSectionTint(colored, 'local', 'subtle')).toEqual({ local: { color: '#22c55e' } })
  })

  it('gives a host missing from the order the neutral color, not the first preset', () => {
    expect(resolveHostColor({}, 'ssh:unlisted', order)).toBe(DEFAULT_REPO_BADGE_COLOR)
  })
})
