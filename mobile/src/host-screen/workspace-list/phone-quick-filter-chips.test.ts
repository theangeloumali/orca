import { describe, expect, it } from 'vitest'
import {
  applyAllChip,
  hasQuickFilterChipOn,
  isThisMachineChipOn,
  toggleThisMachineChip
} from '../../../../src/shared/workspace-view/quick-filter-chips'
import { NO_WORKSPACE_ROW_FILTERS } from '../../../../src/shared/workspace-view/workspace-row-filters'
import type { FilterState } from '../../worktree/workspace-list/workspace-list-types'
import { phoneChipSetters, phoneChipState } from './phone-quick-filter-chips'

function harness(initial: Partial<FilterState>) {
  let filters: FilterState = { ...NO_WORKSPACE_ROW_FILTERS, ...initial }
  let before: FilterState['visibleHostIds'] = null
  const setters = phoneChipSetters(
    (key, value) => {
      filters = { ...filters, [key]: value }
    },
    (ids) => {
      before = ids
    }
  )
  return { state: () => phoneChipState(filters, before), setters, filters: () => filters }
}

describe('phone quick-filter chips', () => {
  it('turns This machine on and back to the hosts shown before', () => {
    const h = harness({ visibleHostIds: ['local', 'ssh:m1'] })
    toggleThisMachineChip(h.state(), h.setters)
    expect(isThisMachineChipOn(h.state().visibleWorkspaceHostIds)).toBe(true)
    toggleThisMachineChip(h.state(), h.setters)
    expect(h.filters().visibleHostIds).toEqual(['local', 'ssh:m1'])
  })

  it('All turns every chip off', () => {
    const h = harness({
      showOnlyRunningTerminals: true,
      showOnlyNeedsYou: true,
      filterRepoIds: ['r']
    })
    expect(hasQuickFilterChipOn(h.state())).toBe(true)
    applyAllChip(h.state(), h.setters)
    expect(hasQuickFilterChipOn(h.state())).toBe(false)
  })
})
