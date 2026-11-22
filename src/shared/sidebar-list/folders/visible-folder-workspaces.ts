import type { ExecutionHostId } from '../../execution-host/execution-host'
import type { FolderWorkspace } from '../../folder-workspaces/folder-workspace-types'
import { getFolderWorkspaceHostIdentity } from '../../folder-workspaces/folder-workspace-worktree'
import type { ProjectGroup } from '../../project/groups/project-group-types'
import { filterFolderWorkspacesFromOtherDevices } from '../../workspace-view/workspace-creator-visibility'
import {
  filterFolderWorkspacesForListingRules,
  type WorkspaceRowFilters
} from '../../workspace-view/workspace-row-filters'
import { matchesFindQuery, normalizeFindQuery } from '../../workspace-view/workspace-find-query'
import type { Worktree } from '../../worktree/types'
import { getWorktreeHostIdentity } from '../../worktree/host-qualified-identity'
import { filterFolderWorkspacesForVisibleHosts } from '../hosts/host-filtering'
import type { SidebarLineageParentIdentities } from '../lineage/worktree-lineage-projection'
import { withoutBotListedFolderWorkspaces } from '../selection/visible-worktrees'

/** The folder workspaces a sidebar list draws after host scope, bot listing, other-device, Active only,
 *  Needs you and find. Each surface passes its own running-terminal and needs-you readers. */
export function selectVisibleFolderWorkspaces(args: {
  folderWorkspaces: readonly FolderWorkspace[]
  projectGroups: readonly ProjectGroup[]
  filters: Pick<
    WorkspaceRowFilters,
    'hideWorkspacesFromOtherDevices' | 'showOnlyRunningTerminals' | 'showOnlyNeedsYou'
  >
  visibleHostIdSet: ReadonlySet<ExecutionHostId> | null
  defaultHostId: ExecutionHostId
  pairedDeviceIdsByEnvironment: Parameters<typeof filterFolderWorkspacesFromOtherDevices>[1]
  botListedIdentities: ReadonlySet<string> | undefined
  hasRunningTerminal: (folder: FolderWorkspace) => boolean
  needsYou?: (folder: FolderWorkspace) => boolean
  /** Raw sidebar find text; matched against the folder name. */
  findQuery?: string
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
  const query = normalizeFindQuery(args.findQuery ?? '')
  return filterFolderWorkspacesForListingRules(deviceVisible, args.filters, {
    hasRunningTerminal: args.hasRunningTerminal,
    needsYou: args.needsYou,
    matchesFind: query === '' ? undefined : (folder) => matchesFindQuery([folder.name], query),
    identityOf: getFolderWorkspaceHostIdentity,
    // Without folder parents nothing nests under a folder, so no listed row can keep one.
    listedRowIdentities: parents ? args.listedWorktrees.map(getWorktreeHostIdentity) : [],
    parentIdentityOf: (identity) => parents?.get(identity)
  })
}
