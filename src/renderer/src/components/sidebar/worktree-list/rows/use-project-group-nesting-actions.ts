import { useCallback } from 'react'
import { useAppStore } from '@/store'
import type { ExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
import { moveProjectGroupToParent } from '@/store/project-groups/move-project-group'
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
    (groupId: string, parentGroupId: string | null, hostId?: ExecutionHostId) =>
      moveProjectGroupToParent({ updateProjectGroup, groupId, parentGroupId, hostId }),
    [updateProjectGroup]
  )

  return { handleCreateProjectSubgroup, handleMoveProjectGroup }
}
