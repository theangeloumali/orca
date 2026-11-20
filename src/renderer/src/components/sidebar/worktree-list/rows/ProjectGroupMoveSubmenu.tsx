import React, { useMemo } from 'react'
import { CornerDownRight } from 'lucide-react'
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from '@/components/ui/dropdown-menu'
import { useTranslate } from '@/i18n/use-translate'
import {
  LOCAL_EXECUTION_HOST_ID,
  type ExecutionHostId
} from '../../../../../../shared/execution-host/execution-host'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import {
  filterProjectGroupsForOwnerHost,
  getProjectGroupMoveTargets
} from '../../../../../../shared/project/groups/project-group-move-targets'

/** "Move group to" lists only the owner computer's groups: a group cannot hold another machine's group. */
export function ProjectGroupMoveSubmenu({
  groupId,
  hostId,
  projectGroups,
  disabled,
  onMove
}: {
  groupId: string
  hostId?: ExecutionHostId
  projectGroups: readonly ProjectGroup[]
  disabled: boolean
  onMove: (groupId: string, parentGroupId: string | null, hostId?: ExecutionHostId) => void
}): React.JSX.Element {
  const t = useTranslate()
  const ownerHostId = hostId ?? LOCAL_EXECUTION_HOST_ID
  const ownGroups = useMemo(
    () => filterProjectGroupsForOwnerHost(projectGroups, ownerHostId),
    [ownerHostId, projectGroups]
  )
  const currentParentId = ownGroups.find((group) => group.id === groupId)?.parentGroupId ?? null
  const groupDestinations = useMemo(
    () => getProjectGroupMoveTargets(ownGroups, groupId),
    [groupId, ownGroups]
  )
  const moveTo = (parentGroupId: string | null): void => onMove(groupId, parentGroupId, hostId)
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={disabled}>
        <CornerDownRight className="size-3.5" />
        {t('auto.components.sidebar.WorktreeList.moveGroupTo', 'Move group to')}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem disabled={currentParentId === null} onSelect={() => moveTo(null)}>
          {t('auto.components.sidebar.WorktreeList.moveGroupTopLevel', 'Top level')}
        </DropdownMenuItem>
        {groupDestinations.map((destination) => (
          <DropdownMenuItem
            key={destination.id}
            disabled={destination.disabled || destination.id === currentParentId}
            onSelect={() => moveTo(destination.id)}
            // Indent by tree depth so nesting reads like the sidebar.
            style={{ paddingLeft: `${0.5 + (destination.depth + 1) * 0.75}rem` }}
          >
            {destination.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
