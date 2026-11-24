import { isExecutionHostForWorktree } from '@/lib/workspace/ownership/qualified-worktree-execution-owner'
import {
  LOCAL_EXECUTION_HOST_ID,
  type ExecutionHostId
} from '../../../../../../shared/execution-host/execution-host'
import { getPtyExecutionHost } from '../../../../../../shared/terminal/pty/lifecycle/terminal-execution-host'
import {
  ptyOutlivesStoppedHost,
  selectStoppedWorkspaceHost
} from '../../workspace-card/activity/stopped-workspace-host'

/** The store fields that place a PTY on a machine and spot a stopped WSL distro. */
export type TerminalHostState = Parameters<typeof isExecutionHostForWorktree>[0] &
  Parameters<typeof selectStoppedWorkspaceHost>[0]

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
  const stoppedHost = selectStoppedWorkspaceHost(state, worktreeId)
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
