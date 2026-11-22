import { useCallback, useMemo } from 'react'
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
import {
  getProjectGroupSubtreeCollapseKeys,
  toggleProjectGroupSubtreeCollapsed
} from '../listing/project-group-subtree-collapse'
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

/** Project headers drawn under a group subtree, for its folded "N projects" summary. */
export function countVisibleProjectGroupSubtreeProjects(
  state: SubtreeState,
  subtreeGroupIds: ReadonlySet<string>
): number {
  const { repos, projectGrouping } = getVisibleSubtreeSources(state)
  return getProjectGroupSubtreeProjectKeys(subtreeGroupIds, repos, projectGrouping).size
}

// Reads the store at call time so Alt-click needs no hook; false means nothing listed to fold.
export function toggleProjectGroupSubtree(groupId: string): boolean {
  const state = useAppStore.getState()
  const subtreeKeys = getVisibleProjectGroupSubtreeKeys(state, groupId)
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
  const projectGroups = useAppStore((s) => s.projectGroups)
  const projects = useAppStore((s) => s.projects)
  const projectHostSetups = useAppStore((s) => s.projectHostSetups)
  const showWorkspaceHostSections = useAppStore((s) => s.showWorkspaceHostSections)
  const visibleWorkspaceHostIds = useAppStore((s) => s.visibleWorkspaceHostIds)
  const workspaceHostScope = useAppStore((s) => s.workspaceHostScope)
  const collapsedGroups = useAppStore((s) => s.collapsedGroups)
  const subtreeKeys = useMemo(
    () =>
      getVisibleProjectGroupSubtreeKeys(
        {
          repos,
          projectGroups,
          projects,
          projectHostSetups,
          showWorkspaceHostSections,
          visibleWorkspaceHostIds,
          workspaceHostScope
        },
        groupId
      ),
    [
      groupId,
      repos,
      projectGroups,
      projects,
      projectHostSetups,
      showWorkspaceHostSections,
      visibleWorkspaceHostIds,
      workspaceHostScope
    ]
  )
  const toggle = useCallback(() => toggleProjectGroupSubtree(groupId), [groupId])
  return {
    hasSubtree: subtreeKeys.length > 0,
    allCollapsed: areAllProjectsCollapsed(subtreeKeys, collapsedGroups),
    toggle
  }
}
