import type { UISlice, UISliceSet } from './ui-slice-contract'

/** Sidebar find and the This-machine chip's restore list: session-only, never persisted. */
export function createUiQuickFilterActions(set: UISliceSet): Partial<UISlice> {
  return {
    sidebarFindQuery: '',
    setSidebarFindQuery: (query) => set({ sidebarFindQuery: query }),
    hostIdsBeforeThisMachineChip: null,
    setHostIdsBeforeThisMachineChip: (ids) => set({ hostIdsBeforeThisMachineChip: ids })
  }
}
