import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/index'
import type { AppState } from '@/store/types'
import { getProjectHostSetupProjectionFromState } from '@/store/projects/project-host-setup-selector'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import { LOCAL_EXECUTION_HOST_ID } from '../../../../../../shared/execution-host/execution-host'
import { resolveVisibleWorkspaceHostIds } from '../../../../../../shared/workspace-view/workspace-host-visibility'
import {
  filterProjectGroupsForVisibleHosts,
  filterReposForVisibleHosts
} from '../../../../../../shared/sidebar-list/hosts/host-filtering'
import { getSidebarProjectGrouping } from '../listing/sidebar-project-grouping'
import { areAllProjectsCollapsed } from '../listing/project-collapse-all'
import { getProjectGroupSubtreeCollapseKeys } from '../listing/project-group-subtree-collapse'
import { getProjectGroupSubtreeProjectKeys } from '../../../../../../shared/sidebar-list/sections/project-group-tree'

const EMPTY_PROJECT_GROUPS: readonly ProjectGroup[] = []

type SubtreeState = Pick<
  AppState,
  'repos' | 'showWorkspaceHostSections' | 'visibleWorkspaceHostIds' | 'workspaceHostScope'
> &
  Partial<Pick<AppState, 'projectGroups' | 'projects' | 'projectHostSetups'>>

// Limited to the hosts the sidebar shows, so a hidden host's rows never count.
function getVisibleSubtreeSources(state: SubtreeState) {
  const visibleHostIds = resolveVisibleWorkspaceHostIds(
    state.visibleWorkspaceHostIds,
    state.workspaceHostScope
  )
  const visibleHostIdSet = visibleHostIds ? new Set(visibleHostIds) : null
  // Unstamped rows belong to this computer; reading the focused host here would grow the focus-read ratchet.
  return {
    projectGroups: filterProjectGroupsForVisibleHosts(
      state.projectGroups ?? EMPTY_PROJECT_GROUPS,
      visibleHostIdSet,
      LOCAL_EXECUTION_HOST_ID
    ),
    repos: filterReposForVisibleHosts(state.repos, visibleHostIdSet, LOCAL_EXECUTION_HOST_ID),
    projectGrouping: getSidebarProjectGrouping(
      getProjectHostSetupProjectionFromState(state),
      state.showWorkspaceHostSections
    )
  }
}

export function getVisibleProjectGroupSubtreeKeys(state: SubtreeState, groupId: string): string[] {
  const { projectGroups, repos, projectGrouping } = getVisibleSubtreeSources(state)
  return getProjectGroupSubtreeCollapseKeys(groupId, projectGroups, repos, projectGrouping)
}

// Raw inputs only: deriving inside the selector would rebuild the grouping on every store update.
function useSubtreeState(): SubtreeState {
  return useAppStore(
    useShallow((s) => ({
      repos: s.repos,
      projectGroups: s.projectGroups,
      projects: s.projects,
      projectHostSetups: s.projectHostSetups,
      showWorkspaceHostSections: s.showWorkspaceHostSections,
      visibleWorkspaceHostIds: s.visibleWorkspaceHostIds,
      workspaceHostScope: s.workspaceHostScope
    }))
  )
}

/** Project headers drawn under a group subtree, for its folded "N projects" summary. */
export function useVisibleProjectGroupSubtreeProjectCount(
  subtreeGroupIds: ReadonlySet<string>
): number {
  const subtreeState = useSubtreeState()
  return useMemo(() => {
    const { repos, projectGrouping } = getVisibleSubtreeSources(subtreeState)
    return getProjectGroupSubtreeProjectKeys(subtreeGroupIds, repos, projectGrouping).size
  }, [subtreeState, subtreeGroupIds])
}

/** The displayed (filter-scoped) fold decides the direction; the list's own toggle writes it. */
export function useProjectGroupSubtreeCollapse(
  groupId: string,
  collapsedGroups: ReadonlySet<string>
): { hasSubtree: boolean; allCollapsed: boolean } {
  const subtreeState = useSubtreeState()
  const subtreeKeys = useMemo(
    () => getVisibleProjectGroupSubtreeKeys(subtreeState, groupId),
    [groupId, subtreeState]
  )
  return {
    hasSubtree: subtreeKeys.length > 0,
    allCollapsed: areAllProjectsCollapsed(subtreeKeys, collapsedGroups)
  }
}
