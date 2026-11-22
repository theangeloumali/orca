import { useAppStore } from '@/store'
import { readRuntimeStatuses } from '@/store/slices/runtime-status/views/runtime-status-owner'
import { getIndexedRepoMap } from '@/store/repos/repository-catalog-index'
import {
  selectFolderWorkspaces,
  selectWorktreesByRepo
} from '@/store/workspaces/catalog/workspace-record-fields'
import { folderMatchesSidebarFind } from '../../../../../../shared/sidebar-list/folders/visible-folder-workspaces'
import { folderIdOfSelector } from '../../../../../../shared/workspace/identity/workspace-scope'
import { getWorktreeHostIdentity } from '../../../../../../shared/worktree/host-qualified-identity'
import type { Worktree } from '../../../../../../shared/worktree/types'
import { sidebarFindIsActive } from '../controls/sidebar-filter-actions'
import './visible-worktrees'
import { computeVisibleWorktrees, worktreeMatchesSidebarFind } from './compute-visible-worktrees'
import { selectListedFolderWorkspaces } from './listed-folder-workspaces'
import { buildVisibleWorktreeOptionsFromState } from './visible-worktree-options-from-state'
import { getVisibleWorkspaceHostIdSet } from './visible-worktree-host-scope'

/** Find has no per-row switch, so revealing a row it hides clears it. Reads the store fresh so filters
 *  lifted by the same reveal count, and keeps find for an ancestor it shows above a matching row. */
export function clearSidebarFindHidingWorkspace(target: Worktree): void {
  const state = useAppStore.getState()
  if (sidebarFindIsActive(state) && !sidebarFindShowsWorkspace(state, target)) {
    state.setSidebarFindQuery('')
  }
}

function sidebarFindShowsWorkspace(
  state: ReturnType<typeof useAppStore.getState>,
  target: Worktree
): boolean {
  const repoMap = getIndexedRepoMap(state.repos)
  const options = buildVisibleWorktreeOptionsFromState(state, readRuntimeStatuses(), repoMap)
  const folderId = folderIdOfSelector(target.id)
  const folder =
    folderId === undefined
      ? undefined
      : selectFolderWorkspaces(state).find((candidate) => candidate.id === folderId)
  if (folderId !== undefined && !folder) {
    return false
  }
  if (
    folder
      ? folderMatchesSidebarFind(folder, state.sidebarFindQuery)
      : worktreeMatchesSidebarFind(target, options)
  ) {
    return true
  }
  const listed = computeVisibleWorktrees(selectWorktreesByRepo(state), [], options)
  if (folder) {
    const listedFolders = selectListedFolderWorkspaces(options, {
      folders: [folder],
      projectGroups: state.projectGroups,
      visibleHostIdSet: getVisibleWorkspaceHostIdSet(state),
      listedWorktrees: listed
    })
    return listedFolders.length > 0
  }
  const targetIdentity = getWorktreeHostIdentity(target)
  return listed.some((row) => getWorktreeHostIdentity(row) === targetIdentity)
}
