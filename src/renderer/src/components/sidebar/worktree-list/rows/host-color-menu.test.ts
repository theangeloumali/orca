import { describe, expect, it } from 'vitest'
import { DEFAULT_REPO_BADGE_COLOR } from '../../../../../../shared/repository/appearance/repo-badge-color'
import { AUTO_HOST_COLORS } from '../../../../../../shared/execution-host/host-appearance'
import { getHostColorMenuValue } from './host-color-menu'

describe('host color menu', () => {
  it('offers no neutral grey swatch, since grey reads as no color', () => {
    expect(AUTO_HOST_COLORS).not.toContain(DEFAULT_REPO_BADGE_COLOR)
    expect(new Set(AUTO_HOST_COLORS).size).toBe(AUTO_HOST_COLORS.length)
  })

  it('checks the stored preset, and lists any other stored hex as a custom entry', () => {
    expect(getHostColorMenuValue(undefined)).toEqual({ selected: 'auto', custom: null })
    expect(getHostColorMenuValue('none')).toEqual({ selected: 'none', custom: null })
    expect(getHostColorMenuValue('#EF4444')).toEqual({ selected: '#ef4444', custom: null })
    expect(getHostColorMenuValue(DEFAULT_REPO_BADGE_COLOR)).toEqual({
      selected: DEFAULT_REPO_BADGE_COLOR,
      custom: DEFAULT_REPO_BADGE_COLOR
    })
  })
})
