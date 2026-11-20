import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { runtimeEnvironmentSupportsCapability } from '@/runtime/rpc/compatibility/runtime-capability-proof'
import type { ExecutionHostId } from '../../../../shared/execution-host/execution-host'
import type { ProjectGroupUpdate } from '../../../../shared/project/groups/project-group-types'
import { PROJECT_GROUP_PARENT_UPDATE_RUNTIME_CAPABILITY } from '../../../../shared/remote-runtime/protocol/worktree-runtime-capabilities'
import { getProjectGroupHeaderKey } from '../../../../shared/sidebar-list/sections/group-keys'

type UpdateProjectGroup = (
  groupId: string,
  updates: ProjectGroupUpdate,
  options?: { hostId?: ExecutionHostId }
) => Promise<unknown>

/** Expands a collapsed group header, so a group moved into it stays visible. */
export function revealProjectGroup(groupId: string): void {
  const { collapsedGroups, toggleCollapsedGroup } = useAppStore.getState()
  const key = getProjectGroupHeaderKey(groupId)
  if (collapsedGroups.has(key)) {
    toggleCollapsedGroup(key)
  }
}

/** Moves a group under another (or to the top level) on its own machine, with user-facing feedback. */
export async function moveProjectGroupToParent(args: {
  updateProjectGroup: UpdateProjectGroup
  groupId: string
  parentGroupId: string | null
  hostId?: ExecutionHostId
  /** Opens the new parent so the moved group stays in view. */
  revealParent?: (parentGroupId: string) => void
}): Promise<boolean> {
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
    return false
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
    return false
  }
  if (args.parentGroupId) {
    ;(args.revealParent ?? revealProjectGroup)(args.parentGroupId)
  }
  return true
}
