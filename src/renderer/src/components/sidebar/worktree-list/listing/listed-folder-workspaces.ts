import type { FolderWorkspace } from '../../../../../../shared/folder-workspaces/folder-workspace-types'
import { getFolderWorkspaceWorktree } from '../../../../../../shared/folder-workspaces/folder-workspace-worktree'
import type { ExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import { selectVisibleFolderWorkspaces } from '../../../../../../shared/sidebar-list/folders/visible-folder-workspaces'
import type { Worktree } from '../../../../../../shared/worktree/types'
import { folderWorkspaceKey } from '../../../../../../shared/workspace/identity/workspace-scope'
import type { VisibleWorktreeOptions } from './compute-visible-worktrees'
import { worktreeHasRunningTerminal } from './desktop-workspace-row-facts'

/** The folder rows the list draws under these options, with every folder listing rule it applies. */
export function selectListedFolderWorkspaces(
  options: VisibleWorktreeOptions,
  args: {
    folderWorkspaces: readonly FolderWorkspace[]
    projectGroups: readonly ProjectGroup[]
    visibleHostIdSet: ReadonlySet<ExecutionHostId> | null
    /** The worktree rows listed under the same options; a folder above one stays to draw it. */
    listedWorktrees: readonly Worktree[]
  }
): readonly FolderWorkspace[] {
  const needsYou = options.worktreeNeedsYou
  return selectVisibleFolderWorkspaces({
    folderWorkspaces: args.folderWorkspaces,
    projectGroups: args.projectGroups,
    filters: options,
    visibleHostIdSet: args.visibleHostIdSet,
    defaultHostId: options.defaultHostId,
    pairedDeviceIdsByEnvironment: options.pairedDeviceIdsByEnvironment,
    botListedIdentities: options.botListedWorktreeIdentities,
    hasRunningTerminal: (folder) =>
      worktreeHasRunningTerminal(
        options.tabsByWorktree,
        options.ptyIdsByTabId,
        folderWorkspaceKey(folder.id)
      ),
    needsYou: needsYou ? (folder) => needsYou(getFolderWorkspaceWorktree(folder)) : undefined,
    findQuery: options.findQuery,
    listedWorktrees: args.listedWorktrees,
    lineageParentIdentities: options.lineageParentIdentities
  })
}
