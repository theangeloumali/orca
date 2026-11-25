import type { AppState } from '@/store/types'
import type { FolderWorkspace } from '../../../shared/folder-workspaces/folder-workspace-types'
import type { RuntimeStatuses } from '@/store/slices/runtime-status/views/runtime-status-owner'
import { getIndexedAllWorktrees } from '@/store/slices/worktrees/listing/worktree-catalog-index'
import { getIndexedRepoMap } from '@/store/repos/repository-catalog-index'
import { ALL_EXECUTION_HOSTS_SCOPE } from '../../../shared/execution-host/execution-host'
import { parseWorkspaceKey } from '../../../shared/workspace/identity/workspace-scope'
import { sidebarHasActiveFilters } from '@/components/sidebar/worktree-list/controls/sidebar-filter-actions'
import {
  computeVisibleWorktrees,
  type VisibleWorktreeOptions
} from '@/components/sidebar/worktree-list/listing/compute-visible-worktrees'
import { selectListedFolderWorkspaces } from '@/components/sidebar/worktree-list/listing/listed-folder-workspaces'
import { buildVisibleWorktreeOptionsFromState } from '@/components/sidebar/worktree-list/listing/visible-worktree-options-from-state'
import { NO_HIDDEN_PROJECTS } from '../../../shared/project/catalog/hidden-projects'
import {
  selectFolderWorkspaces,
  selectWorktreesByRepo
} from '@/store/workspaces/catalog/workspace-record-fields'

/** Apply sidebar kind filters with project/host filters lifted so lineage and host twins follow sidebar visibility. Muting suppresses unread/banner/sound/push.
 * Fail open until settings/UI and terminal reconnect hydrate, or when the workspace is unknown; restored rows otherwise look asleep. */
export function isWorkspaceNotificationMutedBySidebarFilters(
  state: AppState,
  statuses: RuntimeStatuses,
  workspaceId: string
): boolean {
  if (
    state.settings?.notifications?.notifyHiddenWorkspaces !== false ||
    !state.persistedUIReady ||
    !state.workspaceSessionReady ||
    !sidebarHasActiveFilters(state)
  ) {
    return false
  }
  const inputs: VisibleWorktreeOptions = {
    ...buildVisibleWorktreeOptionsFromState(state, statuses, getIndexedRepoMap(state.repos)),
    // Hiding a project is a view choice, never a mute: its workspaces notify as if listed.
    hiddenProjects: NO_HIDDEN_PROJECTS,
    filterRepoIds: [],
    workspaceHostScope: ALL_EXECUTION_HOSTS_SCOPE,
    visibleWorkspaceHostIds: null,
    // Typing a find is a lookup, not a mute; and an arriving event is what Needs you surfaces, even before its status lands.
    findQuery: '',
    showOnlyNeedsYou: false,
    worktreeNeedsYou: undefined
  }
  const scope = parseWorkspaceKey(workspaceId)
  if (scope?.type === 'folder') {
    const folder = selectFolderWorkspaces(state).find((item) => item.id === scope.folderWorkspaceId)
    return folder !== undefined && !isFolderListed(state, inputs, folder)
  }
  const known = getIndexedAllWorktrees(selectWorktreesByRepo(state)).some(
    (worktree) => worktree.id === workspaceId && !worktree.isArchived
  )
  if (!known) {
    return false
  }
  // Use the full sidebar pass (~0.2–0.3ms/1,000 workspaces) to preserve every rule that adds rows back.
  return !computeVisibleWorktrees(selectWorktreesByRepo(state), [], inputs).some(
    (worktree) => worktree.id === workspaceId
  )
}

// The list's own folder rule, so an idle folder Active only hides mutes like a hidden worktree.
function isFolderListed(
  state: AppState,
  inputs: VisibleWorktreeOptions,
  folder: FolderWorkspace
): boolean {
  return selectListedFolderWorkspaces(inputs, {
    folders: [folder],
    projectGroups: state.projectGroups,
    visibleHostIdSet: null,
    listedWorktrees: computeVisibleWorktrees(selectWorktreesByRepo(state), [], inputs)
  }).includes(folder)
}
