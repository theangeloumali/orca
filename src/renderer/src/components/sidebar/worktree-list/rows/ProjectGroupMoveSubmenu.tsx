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
  getRepoExecutionHostId,
  type ExecutionHostId
} from '../../../../../../shared/execution-host/execution-host'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import { getProjectGroupMoveTargets } from '../../../../../../shared/project/groups/project-group-move-targets'

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
    () => projectGroups.filter((group) => getRepoExecutionHostId(group) === ownerHostId),
    [ownerHostId, projectGroups]
  )
  const currentParentId = ownGroups.find((group) => group.id === groupId)?.parentGroupId ?? null
  const targets = useMemo(
    () => getProjectGroupMoveTargets(ownGroups, groupId),
    [groupId, ownGroups]
  )
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={disabled}>
        <CornerDownRight className="size-3.5" />
        {t('auto.components.sidebar.WorktreeList.moveGroupTo', 'Move group to')}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem
          disabled={currentParentId === null}
          onSelect={() => onMove(groupId, null, hostId)}
        >
          {t('auto.components.sidebar.WorktreeList.moveGroupTopLevel', 'Top level')}
        </DropdownMenuItem>
        {targets.map((target) => (
          <DropdownMenuItem
            key={target.id}
            disabled={target.disabled || target.id === currentParentId}
            onSelect={() => onMove(groupId, target.id, hostId)}
            // Indent by tree depth so nesting reads like the sidebar.
            style={{ paddingLeft: `${0.5 + (target.depth + 1) * 0.75}rem` }}
          >
            {target.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
