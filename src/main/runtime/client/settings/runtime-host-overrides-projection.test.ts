import { describe, expect, it } from 'vitest'
import { projectRuntimeHostOverrides } from './runtime-host-overrides-projection'

describe('projectRuntimeHostOverrides', () => {
  it('shares labels, colors and tints but keeps worktree roots private', () => {
    expect(
      projectRuntimeHostOverrides({
        'ssh:m1': {
          displayLabel: ' M1 Max ',
          color: '#3b82f6',
          sectionTint: 'strong',
          defaultWorktreeLocation: '/Users/me/wt'
        }
      })
    ).toEqual({ 'ssh:m1': { displayLabel: 'M1 Max', color: '#3b82f6', sectionTint: 'strong' } })
  })

  it('keeps a host that has only a color, and drops one with only private keys', () => {
    expect(
      projectRuntimeHostOverrides({
        local: { color: 'none' },
        'ssh:nas': { defaultWorktreeLocation: '/srv' }
      })
    ).toEqual({ local: { color: 'none' } })
  })

  it('drops an unknown tint and handles no overrides', () => {
    expect(projectRuntimeHostOverrides({ local: { sectionTint: 'loud' as 'off' } })).toEqual({})
    expect(projectRuntimeHostOverrides(undefined)).toEqual({})
  })
})
