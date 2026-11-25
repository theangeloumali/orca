import { useMemo } from 'react'
import { useAppStore } from '@/store/index'
import { folderWorkspaceKey } from '../../../../../../shared/workspace/identity/workspace-scope'
import type { WorkspaceNeedsYouReader } from './desktop-workspace-row-facts'
import { hasFolderLiveTerminalOnHost } from './live-terminal-on-host'
import { selectHidesEmptyProjectGroups } from '../controls/sidebar-filter-actions'
import type { FolderWorkspace } from '../../../../../../shared/folder-workspaces/folder-workspace-types'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import {
  getRepoExecutionHostId,
  type ExecutionHostId
} from '../../../../../../shared/execution-host/execution-host'
import type { SidebarWorktreeFilters } from './use-filters'
import type { filterFolderWorkspacesFromOtherDevices } from '../../../../../../shared/workspace-view/workspace-creator-visibility'
import {
  filterProjectGroupsForVisibleHosts,
  getVisibleSidebarHostIdSet
} from '../../../../../../shared/sidebar-list/hosts/host-filtering'
import { selectVisibleFolderWorkspaces } from '../../../../../../shared/sidebar-list/folders/visible-folder-workspaces'
import type { SidebarLineageParentIdentities } from '../../../../../../shared/sidebar-list/lineage/worktree-lineage-projection'
import type { Worktree } from '../../../../../../shared/worktree/types'

// Apply host/device scope consistently to repos, project groups and folder workspaces.
export function useSidebarHostVisibleScope(args: {
  filterState: SidebarWorktreeFilters['filterState']
  defaultHostId: ExecutionHostId
  repos: readonly Repo[]
  projectGroups: readonly ProjectGroup[]
  folderWorkspaces: readonly FolderWorkspace[]
  pairedDeviceIdsByEnvironment: Parameters<typeof filterFolderWorkspacesFromOtherDevices>[1]
  /** Listed under their bot instead (compute-visible-worktrees.ts). */
  botListedWorktreeIdentities?: ReadonlySet<string>
  /** The rows the list keeps; Active only keeps an idle folder they nest under. */
  listedWorktrees: readonly Worktree[]
  lineageParentIdentities: SidebarLineageParentIdentities | undefined
  /** Set only while Needs you is on. */
  workspaceNeedsYou?: WorkspaceNeedsYouReader
}) {
  const { filterState, defaultHostId, repos, projectGroups, folderWorkspaces } = args
  const {
    visibleWorkspaceHostIds,
    workspaceHostScope,
    hideWorkspacesFromOtherDevices,
    showOnlyRunningTerminals,
    showOnlyNeedsYou
  } = filterState
  const findQuery = useAppStore((s) => s.sidebarFindQuery)
  const { workspaceNeedsYou } = args
  // A joined string keeps the selection stable.
  const runningFolderIdList = useAppStore((s) =>
    showOnlyRunningTerminals
      ? folderWorkspaces
          .filter((folder) =>
            hasFolderLiveTerminalOnHost(s, s.tabsByWorktree, s.ptyIdsByTabId, {
              folder,
              projectGroups,
              defaultHostId
            })
          )
          .map((folder) => folder.id)
          .join('\n')
      : ''
  )
  const visibleHostIdSet = useMemo(
    () => getVisibleSidebarHostIdSet(visibleWorkspaceHostIds, workspaceHostScope),
    [visibleWorkspaceHostIds, workspaceHostScope]
  )
  const visibleReposForRows = useMemo(() => {
    if (!visibleHostIdSet) {
      return repos
    }
    return repos.filter((repo) => {
      const hostId =
        repo.connectionId || repo.executionHostId ? getRepoExecutionHostId(repo) : defaultHostId
      return visibleHostIdSet.has(hostId)
    })
  }, [defaultHostId, repos, visibleHostIdSet])
  const visibleProjectGroupsForRows = useMemo(
    () => filterProjectGroupsForVisibleHosts(projectGroups, visibleHostIdSet, defaultHostId),
    [defaultHostId, projectGroups, visibleHostIdSet]
  )
  // Only the listing rules read the listed rows, so other list changes leave this memo alone.
  const listedWorktrees = selectHidesEmptyProjectGroups({
    showOnlyRunningTerminals,
    showOnlyNeedsYou: showOnlyNeedsYou === true,
    sidebarFindQuery: findQuery
  })
    ? args.listedWorktrees
    : null
  const visibleFolderWorkspacesForRows = useMemo(() => {
    const runningFolderIds = new Set(runningFolderIdList.split('\n'))
    return selectVisibleFolderWorkspaces({
      folderWorkspaces,
      projectGroups,
      filters: { hideWorkspacesFromOtherDevices, showOnlyRunningTerminals, showOnlyNeedsYou },
      visibleHostIdSet,
      defaultHostId,
      pairedDeviceIdsByEnvironment: args.pairedDeviceIdsByEnvironment,
      botListedIdentities: args.botListedWorktreeIdentities,
      hasRunningTerminal: (folder) => runningFolderIds.has(folder.id),
      needsYou: workspaceNeedsYou
        ? (folder) => workspaceNeedsYou({ id: folderWorkspaceKey(folder.id) })
        : undefined,
      findQuery,
      listedWorktrees: listedWorktrees ?? [],
      lineageParentIdentities: args.lineageParentIdentities
    })
  }, [
    args.botListedWorktreeIdentities,
    args.lineageParentIdentities,
    args.pairedDeviceIdsByEnvironment,
    defaultHostId,
    findQuery,
    folderWorkspaces,
    hideWorkspacesFromOtherDevices,
    listedWorktrees,
    projectGroups,
    runningFolderIdList,
    showOnlyNeedsYou,
    showOnlyRunningTerminals,
    visibleHostIdSet,
    workspaceNeedsYou
  ])

  return { visibleReposForRows, visibleProjectGroupsForRows, visibleFolderWorkspacesForRows }
}
