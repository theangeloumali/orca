import type {
  QuickFilterChipSetters,
  QuickFilterChipState
} from '../../../../src/shared/workspace-view/quick-filter-chips'
import type { FilterState } from '../../worktree/workspace-list/workspace-list-types'

const copyHostIds = (ids: FilterState['visibleHostIds']) => (ids ? [...ids] : null)

type SetFilter = <Key extends keyof FilterState>(key: Key, value: FilterState[Key]) => void

/** The shared chip state over the phone's view filters; the hosts before This machine live on the phone. */
export function phoneChipState(
  filters: FilterState,
  hostIdsBeforeThisMachineChip: FilterState['visibleHostIds']
): QuickFilterChipState {
  return {
    showOnlyRunningTerminals: filters.showOnlyRunningTerminals === true,
    showOnlyNeedsYou: filters.showOnlyNeedsYou === true,
    visibleWorkspaceHostIds: copyHostIds(filters.visibleHostIds),
    hostIdsBeforeThisMachineChip: copyHostIds(hostIdsBeforeThisMachineChip),
    filterRepoIds: filters.filterRepoIds
  }
}

export function phoneChipSetters(
  setFilter: SetFilter,
  setHostIdsBeforeThisMachineChip: (ids: FilterState['visibleHostIds']) => void
): QuickFilterChipSetters {
  return {
    setShowOnlyRunningTerminals: (value) => setFilter('showOnlyRunningTerminals', value),
    setShowOnlyNeedsYou: (value) => setFilter('showOnlyNeedsYou', value),
    setVisibleWorkspaceHostIds: (ids) => setFilter('visibleHostIds', ids),
    setHostIdsBeforeThisMachineChip,
    setFilterRepoIds: (ids) => setFilter('filterRepoIds', ids)
  }
}
