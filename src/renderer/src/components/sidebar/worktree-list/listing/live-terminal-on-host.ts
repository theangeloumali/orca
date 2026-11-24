import { isExecutionHostForWorktree } from '@/lib/workspace/ownership/qualified-worktree-execution-owner'
import type { AppState } from '@/store/types'
import { selectStoppedWslDistro } from '@/runtime/hosts/wsl/wsl-host-stopped-status'
import {
  LOCAL_EXECUTION_HOST_ID,
  parseExecutionHostId,
  type ExecutionHostId
} from '../../../../../../shared/execution-host/execution-host'
import { getPtyExecutionHost } from '../../../../../../shared/terminal/pty/lifecycle/terminal-execution-host'
import type { FolderWorkspace } from '../../../../../../shared/folder-workspaces/folder-workspace-types'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import { getFolderWorkspaceExecutionHostIdForRows } from '../../../../../../shared/sidebar-list/hosts/host-filtering'
import { folderWorkspaceKey } from '../../../../../../shared/workspace/identity/workspace-scope'
import { ptyOutlivesStoppedHost } from '../../workspace-card/activity/stopped-workspace-host'

/** The store fields that place a PTY on a machine and spot a stopped WSL distro. */
export type TerminalHostState = Parameters<typeof isExecutionHostForWorktree>[0] &
  Pick<AppState, 'wslHostStatuses'>

// Keyed by the host being checked: a twin id's stopped WSL copy must not end its local terminals.
function stoppedWslEnvironmentOf(state: TerminalHostState, hostId: ExecutionHostId): string | null {
  const host = parseExecutionHostId(hostId)
  return host?.kind === 'runtime' && selectStoppedWslDistro(state, host.environmentId) !== null
    ? host.environmentId
    : null
}

/**
 * Workspace ids repeat across machines, so a PTY counts only on the machine it runs on.
 * Hostless PTY ids are local; a stopped distro's retained PTYs end with it.
 */
export function hasLiveTerminalOnHost(
  state: TerminalHostState,
  terminalTabs: Readonly<Record<string, readonly { id: string }[]>>,
  ptyIdsByTabId: Readonly<Record<string, readonly string[]>>,
  worktreeId: string,
  hostId: ExecutionHostId
): boolean {
  const stoppedHost = stoppedWslEnvironmentOf(state, hostId)
  return (terminalTabs[worktreeId] ?? []).some((tab) =>
    (ptyIdsByTabId[tab.id] ?? []).some(
      (ptyId) =>
        ptyOutlivesStoppedHost(ptyId, stoppedHost) &&
        isExecutionHostForWorktree(
          state,
          worktreeId,
          hostId,
          getPtyExecutionHost(ptyId) ?? LOCAL_EXECUTION_HOST_ID
        )
    )
  )
}

/** A folder's tabs sit under its folder: key, on the machine its row lists under. */
export function hasFolderLiveTerminalOnHost(
  state: TerminalHostState,
  terminalTabs: Readonly<Record<string, readonly { id: string }[]>>,
  ptyIdsByTabId: Readonly<Record<string, readonly string[]>>,
  folderRow: {
    folder: FolderWorkspace
    projectGroups: readonly ProjectGroup[]
    defaultHostId: ExecutionHostId
  }
): boolean {
  const { folder, projectGroups, defaultHostId } = folderRow
  const hostId = getFolderWorkspaceExecutionHostIdForRows({
    folderWorkspace: folder,
    projectGroup: projectGroups.find((group) => group.id === folder.projectGroupId),
    defaultHostId
  })
  return hasLiveTerminalOnHost(
    state,
    terminalTabs,
    ptyIdsByTabId,
    folderWorkspaceKey(folder.id),
    hostId
  )
}
