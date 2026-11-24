import { describe, expect, it } from 'vitest'
import { matchesSettingsSearch } from '../search/settings-search'
import { getAppearancePaneSearchEntries } from './appearance-search'
import { getSidebarColorsEntry } from './appearance-sidebar-colors-search'

describe('sidebar colors search', () => {
  it('is found from the global settings search by "color"', () => {
    const found = getAppearancePaneSearchEntries().filter((entry) =>
      matchesSettingsSearch('color', entry)
    )
    expect(found).toContainEqual(getSidebarColorsEntry())
  })
})
