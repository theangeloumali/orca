import type { FolderWorkspace } from '../../../../../../shared/folder-workspaces/folder-workspace-types'
import { getFolderWorkspaceWorktree } from '../../../../../../shared/folder-workspaces/folder-workspace-worktree'
import type { ExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import { selectVisibleFolderWorkspaces } from '../../../../../../shared/sidebar-list/folders/visible-folder-workspaces'
import type { Worktree } from '../../../../../../shared/worktree/types'
import type { VisibleWorktreeOptions } from './compute-visible-worktrees'
import { hasFolderLiveTerminalOnHost } from './live-terminal-on-host'

/** The folder rows the list draws under these options, with every folder listing rule it applies. */
export function selectListedFolderWorkspaces(
  options: VisibleWorktreeOptions,
  args: {
    folders: readonly FolderWorkspace[]
    projectGroups: readonly ProjectGroup[]
    visibleHostIdSet: ReadonlySet<ExecutionHostId> | null
    /** The worktree rows listed under the same options; a folder above one stays to draw it. */
    listedWorktrees: readonly Worktree[]
  }
): readonly FolderWorkspace[] {
  const { worktreeNeedsYou: needsYou, terminalHostState } = options
  return selectVisibleFolderWorkspaces({
    folderWorkspaces: args.folders,
    projectGroups: args.projectGroups,
    filters: options,
    visibleHostIdSet: args.visibleHostIdSet,
    defaultHostId: options.defaultHostId,
    pairedDeviceIdsByEnvironment: options.pairedDeviceIdsByEnvironment,
    botListedIdentities: options.botListedWorktreeIdentities,
    hasRunningTerminal: (folder) =>
      hasFolderLiveTerminalOnHost(
        terminalHostState,
        options.tabsByWorktree ?? {},
        options.ptyIdsByTabId ?? {},
        { folder, projectGroups: args.projectGroups, defaultHostId: options.defaultHostId }
      ),
    needsYou: needsYou ? (folder) => needsYou(getFolderWorkspaceWorktree(folder)) : undefined,
    findQuery: options.findQuery,
    listedWorktrees: args.listedWorktrees,
    lineageParentIdentities: options.lineageParentIdentities
  })
}
