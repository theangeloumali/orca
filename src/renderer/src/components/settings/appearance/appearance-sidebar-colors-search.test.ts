import { describe, expect, it } from 'vitest'
import { matchesSettingsSearch } from '../search/settings-search'
import { getAppearancePaneSearchEntries } from './appearance-search'

describe('sidebar colors search', () => {
  it('is found from the global settings search by "color"', () => {
    const titles = getAppearancePaneSearchEntries()
      .filter((entry) => matchesSettingsSearch('color', entry))
      .map((entry) => entry.title)
    expect(titles).toContain('Sidebar colors')
  })
})
