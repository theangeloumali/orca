import { useAppStore } from '../../../store/index'
import { selectWorkspaceRuntimeEnvironmentId } from './workspace-runtime-environment-id'

export function useWorkspaceRuntimeEnvironmentId(
  worktreeId: string | null | undefined
): string | null {
  return useAppStore((state) => selectWorkspaceRuntimeEnvironmentId(state, worktreeId))
}
