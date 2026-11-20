import { useCallback } from 'react'
import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import type { ExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
import type { ProjectGroupNameDialogState } from './use-project-group-dialogs'

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
    async (groupId: string, parentGroupId: string | null, hostId?: ExecutionHostId) => {
      const moved = await updateProjectGroup(groupId, { parentGroupId }, { hostId })
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
    },
    [updateProjectGroup]
  )

  return { handleCreateProjectSubgroup, handleMoveProjectGroup }
}
