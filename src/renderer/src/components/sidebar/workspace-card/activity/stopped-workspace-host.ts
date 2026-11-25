import type { AppState } from '@/store/types'
import { selectStoppedWslDistro } from '@/runtime/hosts/wsl/wsl-host-stopped-status'
import { selectWorkspaceRuntimeEnvironmentId } from '@/lib/workspace/ownership/workspace-runtime-environment-id'
import { parseRemoteRuntimePtyId } from '../../../../../../shared/remote-runtime/remote-runtime-pty-id'

/** The Start card's rule: a pane with no server yet, or on the stopped one, ended with its distro. */
export function ptyOutlivesStoppedHost(
  ptyId: string,
  stoppedEnvironmentId: string | null
): boolean {
  if (stoppedEnvironmentId === null) {
    return true
  }
  const environmentId = parseRemoteRuntimePtyId(ptyId)?.environmentId
  return environmentId != null && environmentId !== stoppedEnvironmentId
}

// Why the cheap check first: every card's selector runs on each store update, and few hosts stop.
function hasStoppedWslHost(state: {
  wslHostStatuses?: Record<string, { state: string }>
}): boolean {
  for (const id in state.wslHostStatuses) {
    if (state.wslHostStatuses[id]?.state === 'distro-stopped') {
      return true
    }
  }
  return false
}

/** The workspace's own WSL host while its distro is known stopped; null otherwise. */
export function selectStoppedWorkspaceHost(
  state: Pick<AppState, 'wslHostStatuses'> &
    Parameters<typeof selectWorkspaceRuntimeEnvironmentId>[0],
  worktreeId: string
): string | null {
  if (!hasStoppedWslHost(state)) {
    return null
  }
  const owner = selectWorkspaceRuntimeEnvironmentId(state, worktreeId)
  return owner && selectStoppedWslDistro(state, owner) !== null ? owner : null
}
