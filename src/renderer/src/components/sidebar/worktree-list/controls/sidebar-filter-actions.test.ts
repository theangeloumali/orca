import { describe, expect, it, vi } from 'vitest'
import {
  clearSidebarFilters,
  selectHidesEmptyProjectGroups,
  type SidebarFilterSetters
} from './sidebar-filter-actions'

function spySetters(): SidebarFilterSetters {
  return {
    setShowSleepingWorkspaces: vi.fn(),
    setAlwaysShowDefaultBranchWorkspace: vi.fn(),
    setHideDefaultBranchWorkspace: vi.fn(),
    setHideAutomationGeneratedWorkspaces: vi.fn(),
    setHideCliCreatedWorkspaces: vi.fn(),
    setHideDetachedHeadWorkspaces: vi.fn(),
    setHideWorkspacesFromOtherDevices: vi.fn(),
    setFilterRepoIds: vi.fn(),
    setVisibleWorkspaceHostIds: vi.fn(),
    setShowOnlyRunningTerminals: vi.fn(),
    setShowOnlyNeedsYou: vi.fn()
  }
}

const unfiltered = {
  showSleepingWorkspaces: true,
  filterRepoIds: [],
  hideDefaultBranchWorkspace: false,
  hideAutomationGeneratedWorkspaces: false,
  hideCliCreatedWorkspaces: false,
  hideDetachedHeadWorkspaces: false,
  hideWorkspacesFromOtherDevices: false,
  showOnlyRunningTerminals: false
}

describe('clearSidebarFilters', () => {
  it('turns Active only off', () => {
    const store = spySetters()
    clearSidebarFilters({ ...unfiltered, showOnlyRunningTerminals: true }, store)
    expect(store.setShowOnlyRunningTerminals).toHaveBeenCalledWith(false)
  })

  it('turns Needs you off', () => {
    const store = spySetters()
    clearSidebarFilters({ ...unfiltered, showOnlyNeedsYou: true }, store)
    expect(store.setShowOnlyNeedsYou).toHaveBeenCalledWith(false)
  })

  it('writes nothing while Active only is already off', () => {
    const store = spySetters()
    clearSidebarFilters(unfiltered, store)
    expect(store.setShowOnlyRunningTerminals).not.toHaveBeenCalled()
  })
})

describe('selectHidesEmptyProjectGroups', () => {
  const quiet = { showOnlyRunningTerminals: false, showOnlyNeedsYou: false, sidebarFindQuery: '' }

  it('keeps empty projects while nothing narrows to matches', () => {
    expect(selectHidesEmptyProjectGroups(quiet)).toBe(false)
    expect(selectHidesEmptyProjectGroups({ ...quiet, sidebarFindQuery: '  ' })).toBe(false)
  })

  it('hides empty projects under Live, Needs you or a find query', () => {
    expect(selectHidesEmptyProjectGroups({ ...quiet, showOnlyRunningTerminals: true })).toBe(true)
    expect(selectHidesEmptyProjectGroups({ ...quiet, showOnlyNeedsYou: true })).toBe(true)
    expect(selectHidesEmptyProjectGroups({ ...quiet, sidebarFindQuery: 'api' })).toBe(true)
  })
})
