import React, { useMemo } from 'react'
import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu'
import { MenuDeviceSections } from '@/components/host-picker/MenuDeviceGroup'
import { useTranslate } from '@/i18n/use-translate'
import { getRepoExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import { getProjectGroupTargetsByDevice } from '../../../../../../shared/project/groups/project-group-device-targets'
import { useAppStore } from '@/store'

/** "Move to group" choices headed by machine: the project's own machine first, the others greyed. */
export function ProjectGroupTargetsByDevice({
  repo,
  projectGroups,
  disabled,
  onSelect
}: {
  repo: Repo
  projectGroups: readonly ProjectGroup[]
  disabled?: boolean
  onSelect: (groupId: string) => void
}): React.JSX.Element {
  const t = useTranslate()
  const hostOrder = useAppStore((s) => s.workspaceHostOrder)
  const ownerHostId = getRepoExecutionHostId(repo)
  const deviceTargets = useMemo(
    () => getProjectGroupTargetsByDevice({ groups: projectGroups, hostOrder, ownerHostId }),
    [hostOrder, ownerHostId, projectGroups]
  )
  const otherDeviceNote = t('auto.components.sidebar.moveToGroup.otherDevice', 'On another device')
  return (
    <MenuDeviceSections
      sections={deviceTargets}
      noteFor={(section) => (section.available ? undefined : otherDeviceNote)}
      renderItems={(section) => (
        <DropdownMenuRadioGroup value={repo.projectGroupId ?? ''} onValueChange={onSelect}>
          {section.groupChoices.map((choice) => (
            <DropdownMenuRadioItem
              key={choice.id}
              value={choice.id}
              textValue={choice.name}
              disabled={disabled || !section.available || choice.id === repo.projectGroupId}
            >
              {/* Indent by tree depth so nesting reads like the sidebar. */}
              <span
                className="max-w-48 truncate"
                style={{ paddingLeft: `${choice.depth * 0.75}rem` }}
              >
                {choice.name}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      )}
    />
  )
}
