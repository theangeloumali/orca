import { selectSidebarLineageParentIdentities } from '@/store/slices/worktrees/metadata/cross-store-lineage-parents'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import type { Worktree } from '../../../../../../shared/worktree/types'
import { getSettingsFocusedExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
import { getWorktreeIdsWithLiveAgent } from '@/lib/workspace/activity/worktree-activity-state'
import type { useAppStore } from '@/store/index'
import type { RuntimeStatuses } from '@/store/slices/runtime-status/views/runtime-status-owner'
import { getWorktreeIdsWithStructuredChat } from './visible-worktree-activity-inputs'
import {
  EMPTY_PAIRED_DEVICE_IDS_BY_ENVIRONMENT,
  getPairedDeviceIdsByEnvironment
} from '../../../../../../shared/workspace-view/workspace-creator-visibility'
import {
  worktreeMatchesSidebarFind,
  type VisibleWorktreeOptions
} from './compute-visible-worktrees'
import { createWorktreeNeedsYouReader } from './desktop-workspace-row-facts'
import { indexHiddenProjects } from '../../../../../../shared/project/catalog/hidden-projects'
import { getSidebarProjectGroupingFromState } from './sidebar-project-grouping'
import { getIndexedRepoMap } from '@/store/repos/repository-catalog-index'
import { sidebarFindIsActive } from '../controls/sidebar-filter-actions'

/** Isolate store reads so sidebar, palette and keyboard shortcuts can share the pure visibility filter. */
export function buildVisibleWorktreeOptionsFromState(
  state: ReturnType<typeof useAppStore.getState>,
  statuses: RuntimeStatuses,
  repoMap: Map<string, Repo>
): VisibleWorktreeOptions {
  const defaultHostId = getSettingsFocusedExecutionHostId(state.settings)
  return {
    filterRepoIds: state.filterRepoIds,
    showSleepingWorkspaces: state.showSleepingWorkspaces,
    tabsByWorktree: state.tabsByWorktree,
    ptyIdsByTabId: state.ptyIdsByTabId,
    browserTabsByWorktree: state.browserTabsByWorktree,
    worktreeIdsWithLiveAgent: getWorktreeIdsWithLiveAgent(
      state.agentStatusByPaneKey,
      state.tabsByWorktree,
      Date.now()
    ),
    worktreeIdsWithStructuredChat: getWorktreeIdsWithStructuredChat(
      state.unifiedTabsByWorktree,
      state.structuredChatSleptAtByPaneKey
    ),
    hideDefaultBranchWorkspace: state.hideDefaultBranchWorkspace,
    hideAutomationGeneratedWorkspaces: state.hideAutomationGeneratedWorkspaces,
    hideCliCreatedWorkspaces: state.hideCliCreatedWorkspaces,
    hideDetachedHeadWorkspaces: state.hideDetachedHeadWorkspaces,
    hideWorkspacesFromOtherDevices: state.hideWorkspacesFromOtherDevices,
    pairedDeviceIdsByEnvironment: state.hideWorkspacesFromOtherDevices
      ? getPairedDeviceIdsByEnvironment(state.runtimeEnvironments, statuses)
      : EMPTY_PAIRED_DEVICE_IDS_BY_ENVIRONMENT,
    alwaysShowDefaultBranchWorkspace: state.alwaysShowDefaultBranchWorkspace,
    showOnlyRunningTerminals: state.showOnlyRunningTerminals,
    showOnlyNeedsYou: state.showOnlyNeedsYou,
    worktreeNeedsYou: state.showOnlyNeedsYou
      ? createWorktreeNeedsYouReader(state.agentStatusByPaneKey.projection, Date.now())
      : undefined,
    findQuery: state.sidebarFindQuery,
    projectGrouping: getSidebarProjectGroupingFromState(state),
    repoMap,
    hiddenProjects: indexHiddenProjects(state.repos, defaultHostId),
    workspaceHostScope: state.workspaceHostScope,
    visibleWorkspaceHostIds: state.visibleWorkspaceHostIds,
    defaultHostId,
    worktreeLineageById: state.worktreeLineageById,
    lineageParentIdentities: selectSidebarLineageParentIdentities(state, statuses),
    preserveLineageParentOrder: state.sortBy === 'manual'
  }
}

/** Find has no per-row switch, so revealing a row it hides clears it. */
export function clearSidebarFindHidingWorktree(
  state: ReturnType<typeof useAppStore.getState>,
  worktree: Pick<Worktree, 'displayName' | 'branch' | 'repoId'>
): void {
  const findOptions = {
    findQuery: state.sidebarFindQuery,
    repoMap: getIndexedRepoMap(state.repos),
    projectGrouping: getSidebarProjectGroupingFromState(state)
  }
  if (sidebarFindIsActive(state) && !worktreeMatchesSidebarFind(worktree, findOptions)) {
    state.setSidebarFindQuery('')
  }
}
