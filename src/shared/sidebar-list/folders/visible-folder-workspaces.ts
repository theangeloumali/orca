import type { ExecutionHostId } from '../../execution-host/execution-host'
import type { FolderWorkspace } from '../../folder-workspaces/folder-workspace-types'
import { getFolderWorkspaceHostIdentity } from '../../folder-workspaces/folder-workspace-worktree'
import type { ProjectGroup } from '../../project/groups/project-group-types'
import { filterFolderWorkspacesFromOtherDevices } from '../../workspace-view/workspace-creator-visibility'
import {
  filterFolderWorkspacesForActiveOnly,
  type WorkspaceRowFilters
} from '../../workspace-view/workspace-row-filters'
import type { Worktree } from '../../worktree/types'
import { getWorktreeHostIdentity } from '../../worktree/host-qualified-identity'
import { filterFolderWorkspacesForVisibleHosts } from '../hosts/host-filtering'
import type { SidebarLineageParentIdentities } from '../lineage/worktree-lineage-projection'
import { withoutBotListedFolderWorkspaces } from '../selection/visible-worktrees'

/** The folder workspaces a sidebar list draws after host scope, bot listing, other-device and
 *  Active only filters. Each surface passes its own running-terminal reader. */
export function selectVisibleFolderWorkspaces(args: {
  folderWorkspaces: readonly FolderWorkspace[]
  projectGroups: readonly ProjectGroup[]
  filters: Pick<WorkspaceRowFilters, 'hideWorkspacesFromOtherDevices' | 'showOnlyRunningTerminals'>
  visibleHostIdSet: ReadonlySet<ExecutionHostId> | null
  defaultHostId: ExecutionHostId
  pairedDeviceIdsByEnvironment: Parameters<typeof filterFolderWorkspacesFromOtherDevices>[1]
  botListedIdentities: ReadonlySet<string> | undefined
  hasRunningTerminal: (folder: FolderWorkspace) => boolean
  /** The worktree rows the list keeps; an idle folder above one stays to draw it. */
  listedWorktrees: readonly Worktree[]
  lineageParentIdentities: SidebarLineageParentIdentities | undefined
}): readonly FolderWorkspace[] {
  const hostVisible = filterFolderWorkspacesForVisibleHosts(
    withoutBotListedFolderWorkspaces(args.folderWorkspaces, args.botListedIdentities),
    args.projectGroups,
    args.visibleHostIdSet,
    args.defaultHostId
  )
  const deviceVisible = args.filters.hideWorkspacesFromOtherDevices
    ? filterFolderWorkspacesFromOtherDevices(hostVisible, args.pairedDeviceIdsByEnvironment)
    : hostVisible
  const parents = args.lineageParentIdentities
  return filterFolderWorkspacesForActiveOnly(deviceVisible, args.filters, {
    hasRunningTerminal: args.hasRunningTerminal,
    identityOf: getFolderWorkspaceHostIdentity,
    // Without folder parents nothing nests under a folder, so no listed row can keep one.
    listedRowIdentities: parents ? args.listedWorktrees.map(getWorktreeHostIdentity) : [],
    parentIdentityOf: (identity) => parents?.get(identity)
  })
}
