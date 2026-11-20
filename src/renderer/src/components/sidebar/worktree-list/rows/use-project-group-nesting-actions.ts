import { useCallback } from 'react'
import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { runtimeEnvironmentSupportsCapability } from '@/runtime/rpc/compatibility/runtime-capability-proof'
import type { AppState } from '@/store/types'
import type { ExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
import { PROJECT_GROUP_PARENT_UPDATE_RUNTIME_CAPABILITY } from '../../../../../../shared/remote-runtime/protocol/worktree-runtime-capabilities'
import type { ProjectGroupNameDialogState } from './use-project-group-dialogs'

/** Moves a group under another (or to the top level) on its own machine, with user-facing feedback. */
export async function moveProjectGroupToParent(args: {
  updateProjectGroup: AppState['updateProjectGroup']
  groupId: string
  parentGroupId: string | null
  hostId?: ExecutionHostId
}): Promise<void> {
  const environmentId = args.hostId?.startsWith('runtime:')
    ? args.hostId.slice('runtime:'.length)
    : null
  // An older server drops parentGroupId and still reports success, so check before writing.
  if (
    environmentId &&
    !(await runtimeEnvironmentSupportsCapability(
      environmentId,
      PROJECT_GROUP_PARENT_UPDATE_RUNTIME_CAPABILITY
    ))
  ) {
    toast.error(
      translate(
        'auto.components.sidebar.WorktreeList.groupMoveNeedsUpdate',
        "Update this machine's Orca to nest groups"
      )
    )
    return
  }
  const moved = await args.updateProjectGroup(
    args.groupId,
    { parentGroupId: args.parentGroupId },
    { hostId: args.hostId }
  )
  if (!moved) {
    toast.error(
      translate('auto.components.sidebar.WorktreeList.groupMoveFailed', 'Could not move group'),
      {
        description: translate(
          'auto.components.sidebar.WorktreeList.groupMoveFailedDesc',
          'A group can only move into a group on the same computer, and never into itself.'
        )
      }
    )
  }
}

/** Group menu actions that nest groups: New subgroup… and Move group to…. */
export function useProjectGroupNestingActions(
  setNameDialog: (state: ProjectGroupNameDialogState | null) => void
) {
  const updateProjectGroup = useAppStore((s) => s.updateProjectGroup)

  const handleCreateProjectSubgroup = useCallback(
    (parentGroupId: string, parentName: string, hostId?: ExecutionHostId) => {
      setNameDialog({ type: 'create-subgroup', parentGroupId, parentName, hostId })
    },
    [setNameDialog]
  )

  const handleMoveProjectGroup = useCallback(
    (groupId: string, parentGroupId: string | null, hostId?: ExecutionHostId) =>
      moveProjectGroupToParent({ updateProjectGroup, groupId, parentGroupId, hostId }),
    [updateProjectGroup]
  )

  return { handleCreateProjectSubgroup, handleMoveProjectGroup }
}
