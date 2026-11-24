import type { ExecutionHostId } from '../../../../shared/execution-host/execution-host'

type ActiveSelection = {
  activeWorktreeId?: string | null
  activeWorkspaceExecutionHostId?: ExecutionHostId | null
}

/** The active workspace's host, or null when there is nothing to tell apart (one host, none active). */
export function resolveTitlebarDeviceHostId(
  selection: ActiveSelection,
  knownWorktreeHostId: ExecutionHostId | undefined,
  hostOptions: readonly { id: ExecutionHostId }[]
): ExecutionHostId | null {
  if (!selection.activeWorktreeId || hostOptions.length < 2) {
    return null
  }
  const hostId = selection.activeWorkspaceExecutionHostId ?? knownWorktreeHostId
  return hostOptions.find((host) => host.id === hostId)?.id ?? null
}
