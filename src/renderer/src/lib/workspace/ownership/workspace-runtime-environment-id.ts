import { parseExecutionHostId } from '../../../../../shared/execution-host/execution-host'
import { workspaceOwnerHostId } from './workspace-row-owner-host'

export function selectWorkspaceRuntimeEnvironmentId(
  state: Parameters<typeof workspaceOwnerHostId>[0],
  worktreeId: string | null | undefined
): string | null {
  const host = worktreeId ? parseExecutionHostId(workspaceOwnerHostId(state, worktreeId)) : null
  return host?.kind === 'runtime' ? host.environmentId : null
}
