import React, { use, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useTranslate } from '@/i18n/use-translate'
import { useAppStore } from '@/store'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import { EMPTY_PROJECT_GROUPS } from '../viewport/viewport-props'
import { splitSelectionByMachine } from '../rows/project-group-batch'
import { GroupSelectedMenuItems } from '../rows/GroupSelectedMenuItems'
import {
  ProjectHeaderSelectionActionsContext,
  ProjectHeaderSelectionStateContext
} from '../rows/project-header-selection-context'

/** "N selected · Group selected… · Clear" while two or more project headers are selected. */
export function ProjectSelectionBar(): React.JSX.Element | null {
  const t = useTranslate()
  const actions = use(ProjectHeaderSelectionActionsContext)
  const { selectedRepos } = use(ProjectHeaderSelectionStateContext)
  const projectGroups = useAppStore((s) => s.projectGroups ?? EMPTY_PROJECT_GROUPS)
  // Clicking into the portaled menu counts as outside the list and clears the selection; act on the snapshot.
  const [menuRepos, setMenuRepos] = useState<readonly Repo[] | null>(null)
  const repos = menuRepos ?? selectedRepos
  const split = repos.length > 1 ? splitSelectionByMachine(repos) : null
  if (!split || !actions) {
    return null
  }
  return (
    // In flow, rendered with the selection itself: rows move in the same commit, and none sits under the bar.
    <div className="relative z-30 flex shrink-0 flex-wrap items-center gap-x-1 border-b border-worktree-sidebar-border bg-worktree-sidebar px-3 py-1 text-[11px] tabular-nums text-muted-foreground">
      <span role="status" className="text-foreground">
        {t('auto.components.sidebar.projectSelection.count', '{{count}} selected', {
          count: repos.length
        })}
      </span>
      {split.stayPut.length > 0 ? (
        <span>
          <span aria-hidden="true">· </span>
          {t(
            'auto.components.sidebar.projectSelection.stayPut',
            '{{count}} on another machine stay put',
            {
              count: split.stayPut.length,
              defaultValue_one: '{{count}} on another machine stays put'
            }
          )}
        </span>
      ) : null}
      <span aria-hidden="true">·</span>
      <DropdownMenu modal={false} onOpenChange={(open) => setMenuRepos(open ? repos : null)}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="link-muted" size="inlineText">
            {t('auto.components.sidebar.projectSelection.groupSelected', 'Group selected…')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="bottom" sideOffset={4}>
          <GroupSelectedMenuItems repos={repos} projectGroups={projectGroups} />
        </DropdownMenuContent>
      </DropdownMenu>
      <span aria-hidden="true">·</span>
      <Button type="button" variant="link-muted" size="inlineText" onClick={actions.clearSelection}>
        {t('auto.components.sidebar.projectSelection.clear', 'Clear')}
      </Button>
    </div>
  )
}
