import type { ExecutionHostId } from '../../execution-host/execution-host'
import type { FolderWorkspace } from '../../folder-workspaces/folder-workspace-types'
import { getFolderWorkspaceWorktree } from '../../folder-workspaces/folder-workspace-worktree'
import type { ProjectGroup } from '../../project/groups/project-group-types'
import { filterFolderWorkspacesFromOtherDevices } from '../../workspace-view/workspace-creator-visibility'
import {
  filterFolderWorkspacesForActiveOnly,
  type WorkspaceRowFilters
} from '../../workspace-view/workspace-row-filters'
import { getWorktreeHostIdentity } from '../../worktree/host-qualified-identity'
import { activityHasRunningTerminal } from '../feed-facts/workspace-activity-facts'
import { filterFolderWorkspacesForVisibleHosts } from '../hosts/host-filtering'
import { withoutBotListedFolderWorkspaces } from '../selection/visible-worktrees'
import type { SidebarFeedDomains } from './sidebar-feed-domains'

/** The feed's folder workspaces after host scope, bot listing, other-device and Active only filters. */
export function selectVisibleFeedFolderWorkspaces(args: {
  domains: Pick<SidebarFeedDomains, 'activity'>
  folderWorkspaces: readonly FolderWorkspace[]
  projectGroups: readonly ProjectGroup[]
  filters: WorkspaceRowFilters
  visibleHostIdSet: ReadonlySet<ExecutionHostId> | null
  defaultHostId: ExecutionHostId
  pairedDeviceIdsByEnvironment: ReadonlyMap<string, string>
  botListedIdentities: ReadonlySet<string> | undefined
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
  return filterFolderWorkspacesForActiveOnly(deviceVisible, args.filters, (folder) =>
    activityHasRunningTerminal(
      args.domains.activity.get(getWorktreeHostIdentity(getFolderWorkspaceWorktree(folder)))
    )
  )
}
