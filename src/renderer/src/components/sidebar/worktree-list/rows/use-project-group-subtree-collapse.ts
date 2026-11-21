import { useCallback, useMemo } from 'react'
import { useAppStore } from '@/store/index'
import type { AppState } from '@/store/types'
import { getProjectHostSetupProjectionFromState } from '@/store/projects/project-host-setup-selector'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import { getSidebarProjectGrouping } from '../listing/sidebar-project-grouping'
import { areAllProjectsCollapsed } from '../listing/project-collapse-all'
import {
  getProjectGroupSubtreeCollapseKeys,
  toggleProjectGroupSubtreeCollapsed
} from '../listing/project-group-subtree-collapse'

const EMPTY_PROJECT_GROUPS: readonly ProjectGroup[] = []

function getSubtreeKeysFromState(state: AppState, groupId: string): string[] {
  return getProjectGroupSubtreeCollapseKeys(
    groupId,
    state.projectGroups ?? EMPTY_PROJECT_GROUPS,
    state.repos,
    getSidebarProjectGrouping(
      getProjectHostSetupProjectionFromState(state),
      state.showWorkspaceHostSections
    )
  )
}

// Reads the store at call time so Alt-click needs no hook; false means nothing listed to fold.
export function toggleProjectGroupSubtree(groupId: string): boolean {
  const state = useAppStore.getState()
  const subtreeKeys = getSubtreeKeysFromState(state, groupId)
  if (subtreeKeys.length === 0) {
    return false
  }
  state.setCollapsedGroups(toggleProjectGroupSubtreeCollapsed(state.collapsedGroups, subtreeKeys))
  return true
}

export function useProjectGroupSubtreeCollapse(groupId: string): {
  hasSubtree: boolean
  allCollapsed: boolean
  toggle: () => void
} {
  const repos = useAppStore((s) => s.repos)
  const projectGroups = useAppStore((s) => s.projectGroups ?? EMPTY_PROJECT_GROUPS)
  const projection = useAppStore(getProjectHostSetupProjectionFromState)
  const showMachineSections = useAppStore((s) => s.showWorkspaceHostSections)
  const collapsedGroups = useAppStore((s) => s.collapsedGroups)
  const subtreeKeys = useMemo(
    () =>
      getProjectGroupSubtreeCollapseKeys(
        groupId,
        projectGroups,
        repos,
        getSidebarProjectGrouping(projection, showMachineSections)
      ),
    [groupId, projectGroups, repos, projection, showMachineSections]
  )
  const toggle = useCallback(() => toggleProjectGroupSubtree(groupId), [groupId])
  return {
    hasSubtree: subtreeKeys.length > 0,
    allCollapsed: areAllProjectsCollapsed(subtreeKeys, collapsedGroups),
    toggle
  }
}
