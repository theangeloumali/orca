import { describe, expect, it, vi } from 'vitest'
import { clearSidebarFilters, type SidebarFilterSetters } from './sidebar-filter-actions'

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
    setShowOnlyRunningTerminals: vi.fn()
  }
}

const unfiltered = {
  showSleepingWorkspaces: true,
  filterRepoIds: [],
  hideDefaultBranchWorkspace: false,
  hideAutomationGeneratedWorkspaces: false,
  hideCliCreatedWorkspaces: false,
  hideDetachedHeadWorkspaces: false,
  hideWorkspacesFromOtherDevices: false
}

describe('clearSidebarFilters', () => {
  it('turns Active only off', () => {
    const store = spySetters()
    clearSidebarFilters({ ...unfiltered, showOnlyRunningTerminals: true }, store)
    expect(store.setShowOnlyRunningTerminals).toHaveBeenCalledWith(false)
  })

  it('writes nothing while Active only is already off', () => {
    const store = spySetters()
    clearSidebarFilters(unfiltered, store)
    expect(store.setShowOnlyRunningTerminals).not.toHaveBeenCalled()
  })
})
