import React, { useMemo } from 'react'
import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu'
import { MenuDeviceGroup } from '@/components/host-picker/MenuDeviceGroup'
import { useTranslate } from '@/i18n/use-translate'
import { getRepoExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import { getProjectGroupTargetsByDevice } from '../../../../../../shared/project/groups/project-group-device-targets'
import { useOrderedDeviceOptions } from '../controls/use-ordered-device-options'

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
  const devices = useOrderedDeviceOptions()
  const ownerHostId = getRepoExecutionHostId(repo)
  const deviceSections = useMemo(
    () => getProjectGroupTargetsByDevice({ groups: projectGroups, hosts: devices, ownerHostId }),
    [devices, ownerHostId, projectGroups]
  )
  const showHeadings = devices.length > 1 || deviceSections.length > 1
  const otherDeviceNote = t('auto.components.sidebar.moveToGroup.otherDevice', 'On another device')
  return (
    <>
      {deviceSections.map((section) => (
        <MenuDeviceGroup
          key={section.hostId}
          hostId={section.hostId}
          host={section.host}
          showHeading={showHeadings}
          note={section.available ? undefined : otherDeviceNote}
        >
          <DropdownMenuRadioGroup value={repo.projectGroupId ?? ''} onValueChange={onSelect}>
            {section.targets.map((target) => (
              <DropdownMenuRadioItem
                key={target.id}
                value={target.id}
                textValue={target.name}
                disabled={disabled || !section.available}
              >
                {/* Indent by tree depth so nesting reads like the sidebar. */}
                <span
                  className="max-w-48 truncate"
                  style={{ paddingLeft: `${target.depth * 0.75}rem` }}
                >
                  {target.name}
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </MenuDeviceGroup>
      ))}
    </>
  )
}
