import type { UISlice, UISliceGet, UISliceSet } from './ui-slice-contract'
import {
  LOCAL_EXECUTION_HOST_ID,
  normalizeExecutionHostScope,
  normalizeVisibleExecutionHostIds
} from '../../../../../shared/execution-host/execution-host'
import type { VisibleWorkspaceHostIds } from '../../../../../shared/ui-chrome/ui-chrome-types'
import { workspaceHostScopeForVisibleHosts } from '../../../../../shared/workspace-view/workspace-host-visibility'

/** Host scope, Needs you, sidebar find and the This-machine chip's session-only restore list. */
export function createUiQuickFilterActions(set: UISliceSet, get: UISliceGet): Partial<UISlice> {
  return {
    workspaceHostScope: 'all',
    // Why: host scope is presentation/filtering only — must never trigger resource teardown (terminals, browser pages).
    setWorkspaceHostScope: (scope) => {
      const normalized = normalizeExecutionHostScope(scope)
      const visibleWorkspaceHostIds = normalized === 'all' ? null : [normalized]
      set({
        workspaceHostScope: normalized,
        visibleWorkspaceHostIds,
        ...thisMachineRestoreForHostIds(visibleWorkspaceHostIds)
      })
    },
    visibleWorkspaceHostIds: null,
    setVisibleWorkspaceHostIds: (ids) => {
      const normalized = normalizeVisibleExecutionHostIds(ids)
      set({
        visibleWorkspaceHostIds: normalized,
        ...thisMachineRestoreForHostIds(normalized),
        workspaceHostScope: workspaceHostScopeForVisibleHosts(normalized, get().workspaceHostScope)
      })
    },
    showOnlyNeedsYou: false,
    setShowOnlyNeedsYou: (v) => set({ showOnlyNeedsYou: v }),
    sidebarFindQuery: '',
    setSidebarFindQuery: (query) => set({ sidebarFindQuery: query }),
    hostIdsBeforeThisMachineChip: null,
    setHostIdsBeforeThisMachineChip: (ids) => set({ hostIdsBeforeThisMachineChip: ids })
  }
}

/** A scope other than this machine turns the chip off, so its restore list would go stale. */
export function thisMachineRestoreForHostIds(
  ids: VisibleWorkspaceHostIds
): Partial<Pick<UISlice, 'hostIdsBeforeThisMachineChip'>> {
  const onlyThisMachine = ids?.length === 1 && ids[0] === LOCAL_EXECUTION_HOST_ID
  return onlyThisMachine ? {} : { hostIdsBeforeThisMachineChip: null }
}
