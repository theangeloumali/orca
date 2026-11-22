import React, { use } from 'react'
import { FolderTree } from 'lucide-react'
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { useTranslate } from '@/i18n/use-translate'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import { ProjectGroupTargetsByDevice } from './ProjectGroupTargetsByDevice'
import { ProjectHeaderSelectionActionsContext } from './project-header-selection-context'

/** "Group selected…" choices: an existing group on the first project's machine, or a new one. */
export function GroupSelectedMenuItems({
  repos,
  projectGroups
}: {
  repos: readonly Repo[]
  projectGroups: readonly ProjectGroup[]
}): React.JSX.Element | null {
  const t = useTranslate()
  const actions = use(ProjectHeaderSelectionActionsContext)
  const [first] = repos
  if (!first || !actions) {
    return null
  }
  return (
    <>
      {projectGroups.length > 0 ? (
        <>
          {/* No current group: the selection may span several, so none is checked or disabled. */}
          <ProjectGroupTargetsByDevice
            repo={{ ...first, projectGroupId: undefined }}
            projectGroups={projectGroups}
            onSelect={(groupId) => actions.groupInto(repos, groupId)}
          />
          <DropdownMenuSeparator />
        </>
      ) : null}
      <DropdownMenuGroup>
        <DropdownMenuItem onSelect={() => actions.createGroupFrom(repos)}>
          <FolderTree className="size-3.5" />
          {t('auto.components.sidebar.projectSelection.newGroup', 'New group…')}
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </>
  )
}
